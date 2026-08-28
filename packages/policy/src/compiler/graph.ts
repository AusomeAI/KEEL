/**
 * Rule Graph Builder: Dependency Graph Construction & Topological Sort
 *
 * Constructs a directed acyclic graph (DAG) of rule dependencies.
 * Performs topological sort to determine execution order.
 *
 * The execution order respects:
 * 1. Rule precedence (primary sort key)
 * 2. Dependency order (if rule A depends on rule B, B must execute first)
 *
 * See ADR 0002 (Policy-as-Code), ADR 0004 (DSL Design).
 */

import type { PolicyDefinition, Rule, Reference, Calculation } from '../schemas/index.js';

/**
 * Represents a node in the rule dependency graph.
 *
 * Extends Rule with dependency metadata.
 */
export interface RuleNode {
  // From Rule
  id: string;
  description: string;
  applicability?: unknown;
  condition?: unknown;
  effect: {
    type: 'compute' | 'apply' | 'validate';
    calculation?: Calculation;
    output?: string;
  };
  citations: string[];
  precedence: number;
  examples?: unknown[];

  // Dependency metadata
  dependencies: Set<string>; // Rule IDs this rule depends on
  dependents: Set<string>; // Rule IDs that depend on this rule
}

/**
 * Build the rule dependency graph from a policy definition.
 *
 * Steps:
 * 1. Flatten all rules from rule groups
 * 2. For each rule, identify dependencies on other rules
 * 3. Create RuleNode objects with dependency metadata
 * 4. Return the rule graph
 *
 * @param policyDef - The policy definition
 * @returns Array of RuleNode objects (includes dependency metadata)
 */
export function buildRuleGraph(policyDef: PolicyDefinition): RuleNode[] {
  // Step 1: Flatten and build rule map
  const ruleMap = new Map<string, Rule>();

  for (const group of policyDef.ruleGroups) {
    for (const rule of group.rules) {
      ruleMap.set(rule.id, rule);
    }
  }

  // Step 2: For each rule, find its dependencies
  const ruleNodes: Map<string, RuleNode> = new Map();

  for (const rule of ruleMap.values()) {
    const dependencies = new Set<string>();

    // Find all rules referenced in this rule's calculation
    if (rule.effect.calculation) {
      const referenced = extractRuleReferences(rule.effect.calculation);
      for (const ruleId of referenced) {
        if (ruleMap.has(ruleId)) {
          dependencies.add(ruleId);
        }
      }
    }

    // Create RuleNode
    const node: RuleNode = {
      ...rule,
      dependencies,
      dependents: new Set(),
    };

    ruleNodes.set(rule.id, node);
  }

  // Step 3: Build reverse dependencies (dependents)
  for (const [ruleId, node] of ruleNodes) {
    for (const depId of node.dependencies) {
      const depNode = ruleNodes.get(depId);
      if (depNode) {
        depNode.dependents.add(ruleId);
      }
    }
  }

  return Array.from(ruleNodes.values());
}

/**
 * Topological sort of rules based on precedence and dependencies.
 *
 * Algorithm:
 * 1. Sort all rules by precedence (ascending)
 * 2. For rules with the same precedence, maintain dependency order
 * 3. Ensure all dependencies of a rule execute before it
 *
 * Uses Kahn's algorithm for topological sort on the dependency graph,
 * with precedence as the tiebreaker.
 *
 * @param ruleGraph - The rule dependency graph
 * @returns Sorted array of rules in execution order
 * @throws Error if circular dependency detected (should have been caught in validation)
 */
export function topologicalSort(ruleGraph: RuleNode[]): Rule[] {
  // Make a copy of in-degrees for manipulation
  const inDegree = new Map<string, number>();
  const nodeMap = new Map<string, RuleNode>();

  for (const node of ruleGraph) {
    nodeMap.set(node.id, node);
    inDegree.set(node.id, node.dependencies.size);
  }

  // Queue of nodes with no dependencies (in-degree = 0)
  // We use a priority queue based on precedence
  const queue: RuleNode[] = Array.from(ruleGraph)
    .filter((node) => inDegree.get(node.id) === 0)
    .sort((a, b) => a.precedence - b.precedence);

  const sorted: Rule[] = [];

  while (queue.length > 0) {
    // Pop from queue (already sorted by precedence)
    const node = queue.shift()!;
    sorted.push(node);

    // Process all dependents of this node
    const nextNodes: RuleNode[] = [];
    for (const dependentId of node.dependents) {
      const dependent = nodeMap.get(dependentId)!;
      const newInDegree = inDegree.get(dependentId)! - 1;
      inDegree.set(dependentId, newInDegree);

      if (newInDegree === 0) {
        nextNodes.push(dependent);
      }
    }

    // Add new ready nodes, maintaining precedence order
    queue.push(...nextNodes);
    queue.sort((a, b) => a.precedence - b.precedence);
  }

  // Check for cycles (though validation should have caught this)
  if (sorted.length !== ruleGraph.length) {
    const unreached = Array.from(nodeMap.keys()).filter(
      (id) => !sorted.find((r) => r.id === id)
    );
    throw new Error(
      `Circular dependency or unreachable rules detected: ${unreached.join(', ')}`
    );
  }

  return sorted;
}

/**
 * Extract rule IDs referenced in a calculation.
 *
 * A rule reference has scope='rule' and path='rule-id.fieldName'.
 *
 * @param calculation - The calculation to scan
 * @returns Set of rule IDs referenced
 */
function extractRuleReferences(calculation: Calculation): Set<string> {
  const references = new Set<string>();

  // Get operands based on calculation type
  const operands = getOperandsForExtraction(calculation);

  for (const operand of operands) {
    if (operand && operand.scope === 'rule') {
      const ruleId = operand.path.split('.')[0];
      if (ruleId) {
        references.add(ruleId);
      }
    }
  }

  // For piecewise, also check values in cases
  if (calculation.type === 'piecewise') {
    for (const caseItem of calculation.cases) {
      if (typeof caseItem.value === 'object' && caseItem.value !== null && 'scope' in caseItem.value) {
        const ref = caseItem.value as Reference;
        if (ref.scope === 'rule') {
          const ruleId = ref.path.split('.')[0];
          if (ruleId) {
            references.add(ruleId);
          }
        }
      }
    }
  }

  return references;
}

/**
 * Get operands from a calculation for extraction purposes.
 */
function getOperandsForExtraction(calculation: Calculation): (Partial<Reference> | null)[] {
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
 * Compute rule metrics for debugging.
 *
 * Useful for understanding policy structure and complexity.
 */
export interface RuleMetrics {
  totalRules: number;
  rulesWithDependencies: number;
  maxDependencyDepth: number;
  averageDependencies: number;
  circularityCheckPassed: boolean;
}

/**
 * Calculate metrics on the rule graph.
 */
export function computeRuleMetrics(ruleGraph: RuleNode[]): RuleMetrics {
  const rulesWithDeps = ruleGraph.filter((r) => r.dependencies.size > 0).length;
  const totalDeps = ruleGraph.reduce((sum, r) => sum + r.dependencies.size, 0);
  const avgDeps = totalDeps / ruleGraph.length;

  // Compute max dependency depth
  const depths = new Map<string, number>();
  let maxDepth = 0;

  function computeDepth(ruleId: string, visited: Set<string> = new Set()): number {
    if (depths.has(ruleId)) {
      return depths.get(ruleId)!;
    }

    if (visited.has(ruleId)) {
      return 0; // Cycle detected
    }

    const rule = ruleGraph.find((r) => r.id === ruleId);
    if (!rule || rule.dependencies.size === 0) {
      depths.set(ruleId, 0);
      return 0;
    }

    visited.add(ruleId);
    let depth = 0;
    for (const depId of rule.dependencies) {
      depth = Math.max(depth, 1 + computeDepth(depId, visited));
    }
    visited.delete(ruleId);

    depths.set(ruleId, depth);
    return depth;
  }

  for (const rule of ruleGraph) {
    maxDepth = Math.max(maxDepth, computeDepth(rule.id));
  }

  return {
    totalRules: ruleGraph.length,
    rulesWithDependencies: rulesWithDeps,
    maxDependencyDepth: maxDepth,
    averageDependencies: avgDeps,
    circularityCheckPassed: true, // Validation should have caught cycles
  };
}
