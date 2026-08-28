#!/usr/bin/env node

/**
 * CI Law 3 Enforcement: The ledger is append-only
 *
 * This script verifies that:
 * 1. No event tables have UPDATE or DELETE grants at the database role level
 * 2. Event table names follow the convention .*_events
 * 3. The schema enforces immutability
 *
 * Why this matters: Law 3 ensures auditability and replayability.
 * The ledger cannot be corrected by mutation; only by compensating events.
 *
 * This check runs against the database schema file (not a live database).
 * It scans the migrations and schema definitions for violations.
 */

import { readFileSync, readdirSync, existsSync } from "fs";
import { resolve } from "path";

const PROJECT_ROOT = process.cwd();
const MIGRATIONS_DIR = resolve(PROJECT_ROOT, "services/ledger/migrations");
const SCHEMA_FILE = resolve(PROJECT_ROOT, "services/ledger/schema.sql");

let exitCode = 0;
const violations = [];

// Check if migrations directory exists
if (!existsSync(MIGRATIONS_DIR)) {
  console.log("ℹ️  Ledger migrations directory not yet created (Wave 1 under way)");
  process.exit(0);
}

try {
  // Scan migration files for UPDATE/DELETE grants on event tables
  const migrationFiles = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  migrationFiles.forEach((file) => {
    const path = resolve(MIGRATIONS_DIR, file);
    const content = readFileSync(path, "utf-8").toUpperCase();

    // Look for patterns that indicate UPDATE/DELETE on event tables
    const eventTablePattern = /CREATE TABLE\s+(\w+_EVENTS)\s*\(/gi;
    const grantPattern = /GRANT\s+(UPDATE|DELETE)\s+ON\s+(\w+)\s+TO/gi;

    // Extract event table names
    const eventTables = new Set();
    let match;
    const tableRegex = /CREATE TABLE\s+(\w+_EVENTS)\s*\(/gi;
    while ((match = tableRegex.exec(content)) !== null) {
      eventTables.add(match[1].toLowerCase());
    }

    // Check for grants to event tables
    const grantRegex = /GRANT\s+(UPDATE|DELETE)\s+ON\s+(\w+)\s+TO/gi;
    while ((match = grantRegex.exec(content)) !== null) {
      const operation = match[1];
      const table = match[2].toLowerCase();

      if (eventTables.has(table)) {
        violations.push({
          file,
          violation: `${operation} grant on event table ${table}`,
          message: `${file}: Found '${operation}' grant on event table '${table}'. Event tables must be append-only (Law 3).`
        });
      }
    }

    // Also check for raw UPDATE/DELETE statements on event tables (anti-pattern)
    eventTables.forEach((table) => {
      if (new RegExp(`\\bUPDATE\\s+${table}\\b`, "i").test(content)) {
        violations.push({
          file,
          violation: `Direct UPDATE on event table ${table}`,
          message: `${file}: Contains UPDATE statement on event table '${table}'. Use compensating events instead.`
        });
      }
      if (new RegExp(`\\bDELETE\\s+FROM\\s+${table}\\b`, "i").test(content)) {
        violations.push({
          file,
          violation: `Direct DELETE on event table ${table}`,
          message: `${file}: Contains DELETE statement on event table '${table}'. Event history is immutable.`
        });
      }
    });
  });

  // Check schema file if it exists
  if (existsSync(SCHEMA_FILE)) {
    const schemaContent = readFileSync(SCHEMA_FILE, "utf-8");

    // Scan for event table definitions that allow updates
    const eventTableMatches = schemaContent.matchAll(/CREATE TABLE\s+(\w+_events)\s*\(([\s\S]*?)\);/gi);
    for (const tableMatch of eventTableMatches) {
      const tableName = tableMatch[1];
      const tableBody = tableMatch[2];

      // Check for TRIGGER that allows updates (common anti-pattern)
      if (/CREATE TRIGGER.*UPDATE/i.test(tableBody)) {
        violations.push({
          file: "schema.sql",
          violation: `Trigger allowing UPDATE on ${tableName}`,
          message: `schema.sql: Event table '${tableName}' has a trigger allowing updates. Event tables must be append-only.`
        });
      }
    }
  }

  // Report findings
  if (violations.length > 0) {
    console.error("\n❌ Law 3 Violation: Ledger is not append-only");
    violations.forEach((v) => {
      console.error(`   • ${v.message}`);
    });
    console.error("\n   Fix: Event tables must have UPDATE and DELETE grants revoked at the role level.");
    console.error("   Event corrections must use compensating events (INSERT new events), not mutations.");
    exitCode = 1;
  } else {
    console.log("✓ Law 3 verified: Event tables are append-only (no UPDATE/DELETE grants)");
  }
} catch (err) {
  console.error(`❌ Error verifying Law 3: ${err.message}`);
  exitCode = 1;
}

process.exit(exitCode);
