/**
 * @keel/policy — Policy DSL, Compiler, and Golden Dataset Harness
 *
 * This package provides the complete policy-as-code infrastructure:
 * 1. Declarative DSL for authoring HR policies (Zod-based schemas)
 * 2. Compiler that converts DSL to typed rule graphs
 * 3. Golden dataset harness for 100% rule coverage testing
 * 4. Policy versioning, signing, and deployment
 *
 * Policies are never LLM-interpreted. They are compiled to deterministic rule graphs
 * and executed by the Rust/WASM kernel in packages/calc.
 *
 * No I/O, no clock, no randomness. Given identical inputs, output is byte-identical forever.
 *
 * See ADR 0002 (Policy-as-Code), ADR 0004 (DSL Design).
 * See Law 2: Manual path first. Law 6: No policy without golden dataset.
 */

// Core schemas
export * from './schemas/index.js';

// Builder API
export { definePolicy, defineRule, PolicyBuilder, RuleBuilder } from './builder.js';
