/**
 * Policy builder: fluent API for defining policies.
 *
 * Makes it easier for domain experts to author policies in TypeScript.
 * Under the hood, validates against Zod schemas.
 *
 * Example:
 * const policy = definePolicy('overtime/us-flsa', {
 *   version: '2026-Q1',
 *   jurisdiction: 'US-FLSA',
 *   author: { id: '...', name: 'Jane Doe' }
 * })
 *   .addRule(defineRule('weekly-ot', {...}))
 *   .addRule(defineRule('daily-ot', {...}))
 *   .compile()
 */

import { PolicyMetadataSchema, ActorSchema } from './schemas/index.js';
import type {
  PolicyMetadata,
  PolicyDefinition,
  RuleGroup,
  PolicyInputSpec,
  PolicyOutputSpec,
  Rule,
  Jurisdiction,
  PolicyId,
  PolicyVersion,
  Actor,
} from './schemas/index.js';

/**
 * Policy builder: fluent interface for defining policies.
 */
export class PolicyBuilder {
  private metadata: Partial<PolicyMetadata> = {};
  private ruleGroups: RuleGroup[] = [];
  private inputSpec: Partial<PolicyInputSpec> = {
    employee: { fields: [] },
    period: { fields: [] },
  };
  private outputSpec: Partial<PolicyOutputSpec> = {
    fields: [],
  };

  constructor(policyId: PolicyId, version: PolicyVersion, jurisdiction: Jurisdiction, author: Actor) {
    this.metadata = {
      id: policyId,
      version,
      jurisdiction,
      author,
      effectiveFrom: new Date(),
    };
  }

  /**
   * Add a rule group to this policy.
   */
  addRuleGroup(group: RuleGroup): this {
    this.ruleGroups.push(group);
    return this;
  }

  /**
   * Add a single rule (creates a rule group automatically).
   */
  addRule(rule: Rule): this {
    const group: RuleGroup = {
      name: `${rule.id} (auto-grouped)`,
      rules: [rule],
    };
    this.ruleGroups.push(group);
    return this;
  }

  /**
   * Specify input fields required by this policy.
   */
  requireEmployeeFields(...fields: string[]): this {
    if (!this.inputSpec.employee) {
      this.inputSpec.employee = { fields: [] };
    }
    this.inputSpec.employee.fields = [...new Set([...this.inputSpec.employee.fields, ...fields])];
    return this;
  }

  /**
   * Specify period fields required by this policy.
   */
  requirePeriodFields(...fields: string[]): this {
    if (!this.inputSpec.period) {
      this.inputSpec.period = { fields: [] };
    }
    this.inputSpec.period.fields = [...new Set([...this.inputSpec.period.fields, ...fields])];
    return this;
  }

  /**
   * Specify output fields this policy produces.
   */
  produceFields(
    ...fields: Array<{ name: string; type: 'money' | 'duration' | 'number' | 'boolean' | 'string'; description: string }>
  ): this {
    if (!this.outputSpec.fields) {
      this.outputSpec.fields = [];
    }
    this.outputSpec.fields = [...this.outputSpec.fields, ...fields];
    return this;
  }

  /**
   * Set the policy description and metadata.
   */
  withDescription(description: string): this {
    this.metadata.description = description;
    return this;
  }

  /**
   * Set the policy approver.
   */
  withApprover(approver: Actor): this {
    this.metadata.approver = approver;
    return this;
  }

  /**
   * Set effective dates.
   */
  effectiveFrom(date: Date): this {
    this.metadata.effectiveFrom = date;
    return this;
  }

  effectiveTo(date: Date): this {
    this.metadata.effectiveTo = date;
    return this;
  }

  /**
   * Validate and build the policy definition.
   *
   * Throws if validation fails.
   */
  build(): PolicyDefinition {
    const policy = {
      metadata: this.metadata as PolicyMetadata,
      ruleGroups: this.ruleGroups,
      inputSpec: this.inputSpec as PolicyInputSpec,
      outputSpec: this.outputSpec as PolicyOutputSpec,
    };

    // Validation happens here; if it fails, an error is thrown
    // This is a placeholder; actual validation is done by the compiler
    if (!this.metadata.description) {
      throw new Error('Policy must have a description');
    }
    if (this.ruleGroups.length === 0) {
      throw new Error('Policy must have at least one rule');
    }

    return policy;
  }
}

/**
 * Create a new policy definition.
 *
 * Usage:
 * const policy = definePolicy('overtime/us-flsa', {
 *   version: '2026-Q1',
 *   jurisdiction: 'US-FLSA',
 *   author: { id: '...', name: 'Jane Doe' }
 * });
 */
export function definePolicy(
  policyId: PolicyId,
  options: {
    version: PolicyVersion;
    jurisdiction: Jurisdiction;
    author: Actor;
  }
): PolicyBuilder {
  return new PolicyBuilder(policyId, options.version, options.jurisdiction, options.author);
}

/**
 * Rule builder: fluent interface for defining rules.
 */
export class RuleBuilder {
  private rule: Partial<Rule> = {};

  constructor(id: string) {
    this.rule.id = id;
  }

  withDescription(description: string): this {
    this.rule.description = description;
    return this;
  }

  withEffect(effect: Rule['effect']): this {
    this.rule.effect = effect;
    return this;
  }

  withCitations(...citations: string[]): this {
    this.rule.citations = citations;
    return this;
  }

  withPrecedence(precedence: number): this {
    this.rule.precedence = precedence;
    return this;
  }

  build(): Rule {
    const rule = this.rule as Rule;
    if (!rule.description) {
      throw new Error('Rule must have a description');
    }
    if (!rule.effect) {
      throw new Error('Rule must have an effect');
    }
    if (!rule.citations || rule.citations.length === 0) {
      throw new Error('Rule must have at least one statutory citation');
    }
    if (rule.precedence === undefined) {
      rule.precedence = 100;
    }
    return rule;
  }
}

/**
 * Create a new rule definition.
 *
 * Usage:
 * const rule = defineRule('weekly-ot')
 *   .withDescription('...')
 *   .withEffect({...})
 *   .withCitations('29 CFR 516.1')
 *   .build();
 */
export function defineRule(id: string): RuleBuilder {
  return new RuleBuilder(id);
}
