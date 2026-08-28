/**
 * Policy Compiler: DSL → Rule Graph
 *
 * Transforms a PolicyDefinition (human-authored DSL) into a CompiledPolicy
 * (machine-executable rule graph).
 *
 * Responsibilities:
 * 1. Validate policy syntax and semantics
 * 2. Build rule dependency graph (topological sort)
 * 3. Resolve references (field paths, constants)
 * 4. Generate execution order
 * 5. Serialize for versioning and signing
 *
 * No LLM execution. Policies are deterministic. See ADR 0002.
 */

import type { PolicyDefinition, CompiledPolicy, Rule, PolicyOutputSpec, Actor } from '../schemas/index.js';
import { validatePolicySyntax, validateSemantics } from './validator.js';
import { buildRuleGraph, topologicalSort } from './graph.js';

/**
 * Compile a policy definition to a rule graph.
 *
 * Main entry point for policy compilation.
 *
 * Steps:
 * 1. Validate syntax (Zod schema checking)
 * 2. Validate semantics (no circular deps, all outputs produced, etc.)
 * 3. Build rule dependency graph
 * 4. Topological sort for execution order
 * 5. Generate CompiledPolicy artifact
 *
 * @param policyDef - The policy definition to compile
 * @returns A CompiledPolicy ready for execution
 * @throws If policy fails validation or has unresolvable references
 */
export function compilePolicy(policyDef: PolicyDefinition): CompiledPolicy {
  // Step 1: Validate syntax
  validatePolicySyntax(policyDef);

  // Step 2: Validate semantics
  validateSemantics(policyDef);

  // Step 3: Build the rule graph (this also resolves dependencies)
  const ruleGraph = buildRuleGraph(policyDef);

  // Step 4: Topological sort for execution order
  const executionOrder = topologicalSort(ruleGraph);

  // Step 5: Extract input fields
  const inputs = [
    ...policyDef.inputSpec.employee.fields,
    ...policyDef.inputSpec.period.fields,
  ];

  // Step 6: Extract output specifications
  const outputs = policyDef.outputSpec.fields.map((field: any) => ({
    name: field.name,
    type: field.type,
    description: field.description,
    citation: field.citation,
  }));

  // Step 7: Create compiled policy artifact
  const compiledAt = new Date();

  const compiled: CompiledPolicy = {
    id: policyDef.metadata.id,
    version: policyDef.metadata.version,
    jurisdiction: policyDef.metadata.jurisdiction,
    author: policyDef.metadata.author,
    approver: policyDef.metadata.approver,
    signature: '', // Will be populated by signer
    compiledAt,
    metadata: policyDef.metadata,
    ruleGraph,
    inputs,
    outputs,
    executionOrder,
  };

  return compiled;
}

/**
 * Export sub-modules for direct use (testing, advanced scenarios)
 */
export { validatePolicySyntax, validateSemantics } from './validator.js';
export { buildRuleGraph, topologicalSort } from './graph.js';
export {
  serializeCompiledPolicy,
  deserializeCompiledPolicy,
  computePolicyHash,
  extractPolicyMetadata,
  createVersionedArtifact,
} from './serializer.js';
export { signPolicy, verifyPolicySignature } from './signer.js';
