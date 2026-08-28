#!/usr/bin/env node

/**
 * CI Law 2 Enforcement: Every TransactionIntent must have a registered human UI route
 *
 * This script:
 * 1. Scans packages/core for all defined TransactionIntent types
 * 2. Checks the route manifest for a corresponding human UI route
 * 3. Fails the build if any intent lacks a UI route
 *
 * Why this matters: Law 2 states "Manual path first, always."
 * Agents cannot use a TransactionIntent type before a human can execute it via the UI.
 */

import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

const PROJECT_ROOT = process.cwd();
const INTENT_REGISTRY_PATH = resolve(PROJECT_ROOT, "packages/core/src/transaction-intent.registry.ts");
const ROUTE_MANIFEST_PATH = resolve(PROJECT_ROOT, "apps/web/src/routes.manifest.json");

let exitCode = 0;

// Check if registry exists
if (!existsSync(INTENT_REGISTRY_PATH)) {
  console.warn(`⚠️  TransactionIntent registry not yet created: ${INTENT_REGISTRY_PATH}`);
  console.warn("   (This warning is expected during Wave 1 Foundations setup)");
  process.exit(0);
}

// Check if route manifest exists
if (!existsSync(ROUTE_MANIFEST_PATH)) {
  console.warn(`⚠️  Route manifest not yet created: ${ROUTE_MANIFEST_PATH}`);
  console.warn("   (This warning is expected during Wave 1 Foundations setup)");
  process.exit(0);
}

try {
  // Parse the intent registry
  const registryContent = readFileSync(INTENT_REGISTRY_PATH, "utf-8");
  const intentMatches = registryContent.match(/export const [A-Z_]+ = "([^"]+)"/g);
  const intents = new Set();

  if (intentMatches) {
    intentMatches.forEach((match) => {
      const intentType = match.match(/"([^"]+)"/)[1];
      intents.add(intentType);
    });
  }

  // Parse the route manifest
  let manifest = {};
  try {
    const manifestContent = readFileSync(ROUTE_MANIFEST_PATH, "utf-8");
    manifest = JSON.parse(manifestContent);
  } catch (err) {
    console.error(`❌ Failed to parse route manifest: ${err.message}`);
    process.exit(1);
  }

  const registeredRoutes = new Set(Object.keys(manifest.transactionIntentRoutes || {}));

  // Check each intent has a route
  let unregisteredIntents = [];
  intents.forEach((intent) => {
    if (!registeredRoutes.has(intent)) {
      unregisteredIntents.push(intent);
    }
  });

  // Report findings
  if (unregisteredIntents.length > 0) {
    console.error("\n❌ Law 2 Violation: Unregistered TransactionIntent types");
    console.error("   These intents are defined but lack a corresponding human UI route:");
    unregisteredIntents.forEach((intent) => {
      console.error(`   - ${intent}`);
    });
    console.error(
      "\n   Fix: Add a route to apps/web/src/routes.manifest.json for each intent."
    );
    console.error(
      "   Remember: The manual UI path must ship before the agent capability."
    );
    exitCode = 1;
  } else if (intents.size === 0) {
    console.log("ℹ️  No TransactionIntent types defined yet (Wave 1 is under way)");
  } else {
    console.log(`✓ Law 2 verified: All ${intents.size} TransactionIntent types have registered UI routes`);
  }
} catch (err) {
  console.error(`❌ Error verifying Law 2: ${err.message}`);
  process.exit(1);
}

process.exit(exitCode);
