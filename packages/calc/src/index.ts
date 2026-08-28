/**
 * @keel/calc — Deterministic Calculation Kernel
 *
 * Pure policy execution: no I/O, no clock, no randomness.
 * Given identical inputs, output is byte-identical forever.
 *
 * This package contains:
 * 1. TypeScript reference implementation (Wave 1)
 * 2. Placeholder for Rust/WASM version (Wave 2)
 *
 * Both implementations produce identical outputs for identical inputs.
 * No LLM is ever invoked to perform calculations.
 *
 * See ADR 0002 (Policy-as-Code), ADR 0004 (DSL Design).
 */

export * from './types.js';
export { executePolicyAsync, executePoliciesBatch } from './executor.js';
