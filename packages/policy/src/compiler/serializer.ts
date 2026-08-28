/**
 * Policy Serializer: JSON Serialization & Versioning
 *
 * Serializes CompiledPolicy to JSON for:
 * 1. Storage in policy registry
 * 2. Version control (git, etc.)
 * 3. Distribution to execution layer
 * 4. Audit trails and signatures
 *
 * Deserialization is also supported for loading policies from storage.
 *
 * See ADR 0002, ADR 0004.
 */

import type { CompiledPolicy } from '../schemas/index.js';
import { CompiledPolicySchema } from '../schemas/index.js';

/**
 * Serialize a compiled policy to JSON.
 *
 * The JSON is deterministic (consistent field order, no extra whitespace initially)
 * to enable reproducible signatures.
 *
 * For signature purposes, use compact JSON (no extra whitespace).
 * For human readability, use indented JSON.
 *
 * @param policy - The compiled policy to serialize
 * @param indent - Optional indentation (for readability); undefined for compact
 * @returns JSON string representation
 */
export function serializeCompiledPolicy(policy: CompiledPolicy, indent?: number): string {
  // Validate before serializing
  CompiledPolicySchema.parse(policy);

  return JSON.stringify(policy, null, indent);
}

/**
 * Deserialize a compiled policy from JSON.
 *
 * Validates the JSON structure against the CompiledPolicy schema.
 * Throws if the JSON is invalid or doesn't match the schema.
 *
 * @param json - JSON string to deserialize
 * @returns Deserialized CompiledPolicy
 * @throws Error if JSON is invalid or schema validation fails
 */
export function deserializeCompiledPolicy(json: string): CompiledPolicy {
  let data: unknown;

  try {
    data = JSON.parse(json);
  } catch (err) {
    throw new Error(`Failed to parse policy JSON: ${err instanceof Error ? err.message : String(err)}`);
  }

  try {
    return CompiledPolicySchema.parse(data);
  } catch (err) {
    throw new Error(
      `Policy JSON does not match schema: ${err instanceof Error ? err.message : String(err)}`
    );
  }
}

/**
 * Compute a deterministic hash of a policy for versioning and signatures.
 *
 * Uses SHA-256 of the compact JSON representation.
 * This ensures the hash is reproducible and tamper-evident.
 *
 * Note: In production, this would use Node.js crypto module.
 * For now, we provide a placeholder.
 *
 * @param policy - The compiled policy
 * @returns SHA-256 hash (hex string)
 */
export async function computePolicyHash(policy: CompiledPolicy): Promise<string> {
  // Serialize to compact JSON
  const json = serializeCompiledPolicy(policy, undefined);

  // Try to use Node.js crypto if available
  try {
    // Dynamic import with proper typing
    const cryptoModule = (await import('crypto')) as any;
    if (cryptoModule && typeof cryptoModule.createHash === 'function') {
      return cryptoModule.createHash('sha256').update(json).digest('hex');
    }
  } catch {
    // Crypto not available, fall back to simple hash
  }

  // Fallback for environments without crypto
  // (This is NOT suitable for production; use proper crypto)
  return simpleHash(json);
}

/**
 * Simple hash function (NOT cryptographically secure).
 *
 * Used only as a fallback when crypto is unavailable.
 * DO NOT use for production security.
 *
 * @param str - String to hash
 * @returns Hash string
 */
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(16);
}

/**
 * Policy metadata for versioning and tracking.
 *
 * Stored alongside the compiled policy for lookups and auditing.
 */
export interface PolicyMetadata {
  policyId: string;
  version: string;
  jurisdiction: string;
  compiledAt: Date;
  hash: string;
  authorName: string;
  approverName?: string;
  effectiveFrom: Date;
  effectiveTo?: Date;
  description: string;
}

/**
 * Extract metadata from a compiled policy for storage.
 *
 * @param policy - The compiled policy
 * @param hash - The SHA-256 hash of the policy
 * @returns Metadata record
 */
export function extractPolicyMetadata(
  policy: CompiledPolicy,
  hash: string
): PolicyMetadata {
  return {
    policyId: policy.id,
    version: policy.version,
    jurisdiction: policy.jurisdiction,
    compiledAt: policy.compiledAt,
    hash,
    authorName: policy.author.name,
    approverName: policy.approver?.name,
    effectiveFrom: policy.metadata.effectiveFrom,
    effectiveTo: policy.metadata.effectiveTo,
    description: policy.metadata.description,
  };
}

/**
 * Create a versioned policy artifact for deployment.
 *
 * Combines the compiled policy with metadata and hash for immutable storage.
 */
export interface VersionedPolicyArtifact {
  policy: CompiledPolicy;
  metadata: PolicyMetadata;
  hash: string;
  serialized: string;
}

/**
 * Create a versioned artifact from a compiled policy.
 *
 * @param policy - The compiled policy
 * @returns Versioned artifact ready for storage
 */
export async function createVersionedArtifact(
  policy: CompiledPolicy
): Promise<VersionedPolicyArtifact> {
  const hash = await computePolicyHash(policy);
  const metadata = extractPolicyMetadata(policy, hash);
  const serialized = serializeCompiledPolicy(policy, 2); // Pretty-print for storage

  return {
    policy,
    metadata,
    hash,
    serialized,
  };
}

/**
 * Policy archive format: used for long-term storage and audit trails.
 *
 * Contains the policy, metadata, signatures, and audit trail.
 */
export interface PolicyArchive {
  policy: CompiledPolicy;
  metadata: PolicyMetadata;
  hash: string;
  signatures: {
    author: {
      algorithm: string;
      value: string;
      keyId: string;
    };
    approver?: {
      algorithm: string;
      value: string;
      keyId: string;
    };
  };
  auditTrail: Array<{
    action: string;
    actor: string;
    timestamp: Date;
    notes?: string;
  }>;
}

/**
 * Convert a versioned artifact to an archive format.
 *
 * Archives include signatures and audit trail for complete lineage tracking.
 */
export function createPolicyArchive(
  artifact: VersionedPolicyArtifact
): PolicyArchive {
  const { policy, metadata, hash } = artifact;

  return {
    policy,
    metadata,
    hash,
    signatures: {
      author: {
        algorithm: policy.signatures?.author?.algorithm || 'SHA256-ECDSA',
        value: policy.signatures?.author?.value || '',
        keyId: policy.signatures?.author?.publicKeyId || '',
      },
      approver: policy.approver
        ? {
            algorithm: policy.signatures?.approver?.algorithm || 'SHA256-ECDSA',
            value: policy.signatures?.approver?.value || '',
            keyId: policy.signatures?.approver?.publicKeyId || '',
          }
        : undefined,
    },
    auditTrail: [
      {
        action: 'compiled',
        actor: policy.author.name,
        timestamp: policy.compiledAt,
        notes: `Policy compiled from DSL`,
      },
    ],
  };
}

/**
 * Compute file path for policy storage.
 *
 * Policies are stored in a hierarchical structure:
 * policies/{jurisdiction}/{policyId}/{version}.json
 *
 * @param archive - The policy archive
 * @returns Relative file path
 */
export function computeStoragePath(archive: PolicyArchive): string {
  const { jurisdiction, policyId, version } = archive.metadata;
  const safeId = policyId.replace(/\//g, '-');
  const safeVersion = version.replace(/\//g, '-');
  return `policies/${jurisdiction}/${safeId}/${safeVersion}.json`;
}
