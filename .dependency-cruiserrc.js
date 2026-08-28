/**
 * Dependency Cruiser configuration for KEEL
 *
 * Enforces Law 1: No LLM, model SDK, or agent library imports in the deterministic core.
 *
 * Core packages that must never import from LLM providers:
 * - packages/core/**
 * - packages/policy/**
 * - packages/calc/**
 * - services/ledger/**
 *
 * Everything else (apps, services except ledger, packages except core/policy/calc)
 * can import from LLM providers, but only through well-defined interfaces.
 */

module.exports = {
  extends: "node-base",

  forbidden: [
    // Law 1: No model/LLM imports in deterministic core
    {
      name: "no-llm-in-core",
      comment: "Core packages must not import LLM SDKs, model providers, or agent libraries (Law 1)",
      severity: "error",
      from: {
        path: [
          "^packages/core",
          "^packages/policy",
          "^packages/calc",
          "^services/ledger"
        ]
      },
      to: {
        // Forbidden packages and modules
        pathNot: [
          // Allowed third-party libs
          "^node_modules/zod",
          "^node_modules/typescript",
          "^node_modules/vitest",
          "^node_modules/uuid",
          "^node_modules/@types",
          "^node_modules/decimal.js",
          "^node_modules/date-fns",
          "^node_modules/lodash",
          "^node_modules/pg",
          "^node_modules/temporal-sdk",
          "^node_modules/pino",
          "^node_modules/opentelemetry",
          "^node_modules/fastify",
          "^node_modules/@fastify",
        ],
        path: [
          // LLM provider SDKs (forbidden)
          "openai",
          "anthropic",
          "@anthropic-ai",
          "aws-sdk/clients/bedrock",
          "@aws-sdk/client-bedrock",
          "google-generativeai",
          "cohere",
          "groq",
          "mistralai",
          "huggingface",
          "@huggingface",
          "replicate",
          "langchain",
          "llamaindex",
          "vercel/ai",
          // Agent frameworks (forbidden)
          "autogen",
          "@microsoft/autogen",
          "crewai",
          "phidata",
          "modal",
          "marvin",
          "semantic-kernel",
          // MCP clients (forbidden in core; allowed in agent-plane)
          "mcp",
          "@modelcontextprotocol",
          // Agent registries (forbidden)
          "eliza",
          "elipse-agent",
        ]
      }
    },

    // Law 5: Tenant isolation must not be bypassed
    {
      name: "no-bypass-tenant-isolation",
      comment: "Tenant isolation rules must be enforced at the kernel level via RLS, never bypassed in queries (Law 5)",
      severity: "error",
      from: {
        path: "^services/.*",
        pathNot: "^services/gate"
      },
      to: {
        path: "^services/ledger.*",
        pathNot: "^services/ledger/queries.*"
      }
    },

    // Cyclic dependencies are allowed but should be tracked
    {
      name: "no-high-severity-cycles",
      comment: "Cycles in the deterministic core should be minimized",
      severity: "warn",
      from: {
        path: "^packages/core",
        pathNot: "^packages/core/test"
      },
      to: {
        path: "^packages/core",
        via: ".*test.*"
      }
    }
  ],

  options: {
    doNotFollow: {
      path: [
        "node_modules",
        "packages/.*/node_modules",
        "services/.*/node_modules",
        "apps/.*/node_modules",
        "packs/.*/node_modules"
      ],
      dependencyTypes: [
        "npm",
        "peer",
        "optional"
      ]
    },
    reporterOptions: {
      dot: {
        collapseFolder: true,
        theme: {
          replace: [
            {
              pattern: "^packages/core",
              color: "#ffcccc"
            },
            {
              pattern: "^packages/policy",
              color: "#ffe6cc"
            },
            {
              pattern: "^packages/calc",
              color: "#ffffcc"
            },
            {
              pattern: "^services/ledger",
              color: "#ffccff"
            },
            {
              pattern: "^services/agent-plane",
              color: "#ccffff"
            }
          ]
        }
      },
      json: {
        checkDeprecations: true
      }
    },
    maxDepth: 10,
    // TypeScript-specific options
    tsPreCompilationDeps: true,
    tsConfig: {
      fileName: "tsconfig.json"
    },
    // Cache results for faster re-runs
    cache: {
      strategy: "metadata",
      folder: ".dependency-cruiser-cache"
    }
  }
};
