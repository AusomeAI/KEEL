/**
 * Policy Validator: Syntax and Semantic Validation
 *
 * Validates that a policy definition is:
 * 1. Syntactically correct (matches Zod schemas)
 * 2. Semantically valid (no circular deps, all refs resolvable, etc.)
 *
 * Throws descriptive errors if validation fails.
 * See ADR 0002, ADR 0004.
 */

import type {
  PolicyDefinition,
  Rule,
  Reference,
  Calculation,
  RuleGroup,
} from '../schemas/index.js';
import { PolicyDefinitionSchema } from '../schemas/index.js';

/**
 * Validation error: thrown when policy fails validation.
 */
export class ValidationError extends Error {
  constructor(
    message: string,
    public readonly context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * Validate policy syntax against Zod schemas.
 *
 * This ensures the policy definition matches the schema exactly.
 * If validation fails, throws a descriptive error.
 *
 * @param policyDef - The policy definition to validate
 * @throws ValidationError if schema validation fails
 */
export function validatePolicySyntax(policyDef: unknown): PolicyDefinition {
  try {
    return PolicyDefinitionSchema.parse(policyDef);
  } catch (err) {
    const zodErr = err as any;
    throw new ValidationError(`Policy syntax validation failed: ${zodErr.message}`, {
      errors: zodErr.errors,
    });
  }
}

/**
 * Validate policy semantics: logical correctness and consistency.
 *
 * Checks:
 * 1. All referenced fields exist in input specs
 * 2. No circular dependencies in rule references
 * 3. All output fields are produced by at least one rule
 * 4. Rule IDs are unique within the policy
 * 5. Precedence values are reasonable
 * 6. Calculations reference valid fields
 *
 * @param policyDef - The validated policy definition
 * @throws ValidationError if semantic validation fails
 */
export function validateSemantics(policyDef: PolicyDefinition): void {
  // Rule 1: Collect all input field names
  const availableFields = new Set<string>();
  const employeeFields = policyDef.inputSpec.employee.fields;
  const periodFields = policyDef.inputSpec.period.fields;

  for (const field of employeeFields) {
    availableFields.add(`employee.${field}`);
    availableFields.add(field); // Allow shorthand too
  }

  for (const field of periodFields) {
    availableFields.add(`period.${field}`);
    availableFields.add(field); // Allow shorthand too
  }

  // Rule 2: Collect all rules and build a map
  const allRules = new Map<string, Rule>();
  const ruleIds = new Set<string>();

  for (const group of policyDef.ruleGroups) {
    for (const rule of group.rules as any[]) {
      if (ruleIds.has(rule.id)) {
        throw new ValidationError(`Duplicate rule ID: ${rule.id}`, {
          ruleId: rule.id,
        });
      }
      ruleIds.add(rule.id);
      allRules.set(rule.id, rule);
    }
  }

  // Rule 3: Track which output fields are produced
  const producedOutputs = new Set<string>();
  const outputFieldNames = new Set(policyDef.outputSpec.fields.map((f: any) => f.name));

  // Rule 4: Validate all calculations reference available fields
  for (const rule of allRules.values()) {
    if (rule.effect.calculation) {
      validateCalculationReferences(rule.effect.calculation, availableFields, allRules);

      // Track which output this rule produces
      if (rule.effect.output) {
        producedOutputs.add(rule.effect.output);
      }
    }
  }

  // Rule 5: Ensure all output fields are produced
  for (const outputField of outputFieldNames) {
    const fieldName = String(outputField);
    if (!producedOutputs.has(fieldName)) {
      throw new ValidationError(`Output field not produced by any rule: ${fieldName}`, {
        outputField: fieldName,
        producedOutputs: Array.from(producedOutputs),
      });
    }
  }

  // Rule 6: Check for circular dependencies (basic check via DFS)
  checkForCircularDependencies(allRules);

  // Rule 7: Validate precedence values
  for (const rule of allRules.values()) {
    if (rule.precedence < 0 || rule.precedence > 9999) {
      throw new ValidationError(
        `Rule precedence out of range [0, 9999]: ${rule.id} (precedence: ${rule.precedence})`,
        { ruleId: rule.id, precedence: rule.precedence }
      );
    }
  }
}

/**
 * Validate that all references in a calculation point to available fields or rules.
 *
 * References can be:
 * - employee fields: { scope: 'employee', path: 'hourlyRate' }
 * - period fields: { scope: 'period', path: 'hoursWorked' }
 * - rule outputs: { scope: 'rule', path: 'rule-id.outputName' }
 * - constants: { scope: 'constant', path: 'OT_MULTIPLIER' }
 *
 * @param calculation - The calculation to validate
 * @param availableFields - Set of available field names
 * @param allRules - Map of rule ID to rule
 * @throws ValidationError if a reference is unresolvable
 */
function validateCalculationReferences(
  calculation: Calculation,
  availableFields: Set<string>,
  allRules: Map<string, Rule>
): void {
  const operands = getOperands(calculation);

  for (const operand of operands) {
    if (!operand) continue;

    if (operand.scope === 'constant') {
      // Constants are always valid (they're defined at compile time or policy time)
      continue;
    }

    if (operand.scope === 'rule') {
      // Reference to a prior rule output: "rule-id.outputName"
      const [ruleId, outputName] = operand.path.split('.');
      if (!ruleId || !outputName) {
        throw new ValidationError(`Invalid rule reference format: ${operand.path}. Expected "rule-id.outputName".`, {
          reference: operand,
        });
      }

      if (!allRules.has(ruleId)) {
        throw new ValidationError(`Rule not found: ${ruleId} (referenced in ${operand.path})`, {
          reference: operand,
          availableRules: Array.from(allRules.keys()),
        });
      }

      // Note: We don't validate that the rule produces the output field yet
      // (that's done in dependency ordering)
      continue;
    }

    if (operand.scope === 'employee' || operand.scope === 'period') {
      // Reference to employee or period field
      const fieldName = operand.path.includes('.') ? operand.path : `${operand.scope}.${operand.path}`;
      if (!availableFields.has(fieldName) && !availableFields.has(operand.path)) {
        throw new ValidationError(
          `Field not found in ${operand.scope} spec: ${operand.path}`,
          {
            reference: operand,
            availableFields: Array.from(availableFields),
          }
        );
      }
      continue;
    }

    throw new ValidationError(`Unknown reference scope: ${operand.scope}`, {
      reference: operand,
    });
  }

  // Recursively validate nested calculations
  if (calculation.type === 'piecewise') {
    for (const caseItem of calculation.cases) {
      if (typeof caseItem.value === 'object' && caseItem.value !== null && 'scope' in caseItem.value) {
        // It's a reference
        validateCalculationReferences(
          { type: 'literal', value: caseItem.value as any },
          availableFields,
          allRules
        );
      }
    }
  }
}

/**
 * Extract operands from a calculation.
 *
 * Returns an array of Reference objects (may include null/undefined if not applicable).
 */
function getOperands(calculation: Calculation): (Partial<Reference> | null)[] {
  switch (calculation.type) {
    case 'literal':
      return [];
    case 'multiply':
    case 'add':
    case 'subtract':
    case 'divide':
    case 'min':
    case 'max':
      return calculation.operands;
    case 'piecewise':
      return [];
    case 'lookup':
      return [calculation.key];
    default:
      return [];
  }
}

/**
 * Check for circular dependencies in the rule graph using DFS.
 *
 * A circular dependency exists if a rule references (directly or indirectly)
 * another rule that depends on the first rule.
 *
 * @param allRules - Map of rule ID to rule
 * @throws ValidationError if circular dependency detected
 */
function checkForCircularDependencies(allRules: Map<string, Rule>): void {
  const visited = new Set<string>();
  const inPath = new Set<string>();

  function dfs(ruleId: string, path: string[]): void {
    if (inPath.has(ruleId)) {
      const cycleList = [...path, ruleId];
      const cycle = cycleList.join(' → ');
      throw new ValidationError(`Circular dependency detected: ${cycle}`, {
        cycle: cycleList,
      });
    }

    if (visited.has(ruleId)) {
      return;
    }

    inPath.add(ruleId);
    visited.add(ruleId);

    const rule = allRules.get(ruleId);
    if (!rule || !rule.effect.calculation) {
      inPath.delete(ruleId);
      return;
    }

    // Find all rules referenced by this calculation
    const operands = getOperands(rule.effect.calculation);
    for (const operand of operands) {
      if (!operand || operand.scope !== 'rule') continue;

      const [referencedRuleId] = (operand.path || '').split('.');
      if (referencedRuleId && allRules.has(referencedRuleId)) {
        dfs(referencedRuleId, [...path, ruleId]);
      }
    }

    inPath.delete(ruleId);
  }

  for (const ruleId of allRules.keys()) {
    if (!visited.has(ruleId)) {
      dfs(ruleId, []);
    }
  }
}
