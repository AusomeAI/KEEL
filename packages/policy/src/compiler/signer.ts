/**
 * Policy Signer: Cryptographic Signatures for Policies
 *
 * Enables:
 * 1. Author attribution (who wrote this policy?)
 * 2. Approver verification (who approved deployment?)
 * 3. Tamper detection (has this policy been modified?)
 * 4. Non-repudiation (audit trail)
 *
 * Policies are signed with:
 * - Author signature: mandatory, applied at compilation
 * - Approver signature: required before activation in production
 *
 * See Law 10: Per-agent identity with traceable actions.
 */

import type { CompiledPolicy, Actor, Signature } from '../schemas/index.js';

/**
 * Helper to encode strings to base64.
 */
function encodeToBase64(str: string): string {
  try {
    // Try Node.js Buffer if available
    return Buffer.from(str).toString('base64');
  } catch {
    // Fallback for browser/other environments
    const encoded = new TextEncoder().encode(str);
    let binary = '';
    for (let i = 0; i < encoded.length; i++) {
      binary += String.fromCharCode(encoded[i]);
    }
    return btoa(binary);
  }
}

declare const Buffer: any;
declare const TextEncoder: any;
declare function btoa(str: string): string;

/**
 * Signature options for signing a policy.
 */
export interface SigningOptions {
  algorithm?: 'SHA256-RSA' | 'SHA256-ECDSA'; // Default: SHA256-ECDSA
  keyId?: string; // Reference to the signing key
}

/**
 * Sign a compiled policy with author credentials.
 *
 * The signature is computed over the policy JSON (excluding existing signatures).
 * In production, this uses the author's private key from a key management system.
 *
 * For development/testing, we provide a mock implementation that accepts
 * a mock private key or uses a development key.
 *
 * @param policy - The compiled policy to sign
 * @param actor - The actor (author or approver)
 * @param privateKey - Mock private key (for testing)
 * @param options - Signing options
 * @returns The policy with added signature
 */
export async function signPolicy(
  policy: CompiledPolicy,
  actor: Actor,
  privateKey?: string,
  options: SigningOptions = {}
): Promise<CompiledPolicy> {
  const algorithm = options.algorithm || 'SHA256-ECDSA';
  const keyId = options.keyId || `${actor.id}/${Date.now()}`;

  // Compute signature over the policy
  const signature = await computeSignature(policy, privateKey || 'mock-key', algorithm);

  // Add author signature
  if (actor.role === 'author' || actor.role === 'administrator') {
    policy.signatures.author = {
      algorithm,
      value: signature,
      publicKeyId: keyId,
    };
    policy.author = actor;
  }

  // Add approver signature
  if (actor.role === 'approver' || actor.role === 'administrator') {
    policy.signatures.approver = {
      algorithm,
      value: signature,
      publicKeyId: keyId,
    };
    policy.approver = actor;
  }

  policy.signature = signature;

  return policy;
}

/**
 * Verify a policy signature.
 *
 * Checks that the signature matches the current policy state.
 * In production, this uses the signing key from the key management system.
 *
 * @param policy - The compiled policy to verify
 * @param actor - The actor who signed
 * @param publicKey - Public key for verification (for testing)
 * @returns true if signature is valid
 */
export async function verifyPolicySignature(
  policy: CompiledPolicy,
  actor: Actor,
  publicKey?: string
): Promise<boolean> {
  // Get the signature to verify
  const signature = actor.role === 'approver' ? policy.signatures.approver : policy.signatures.author;

  if (!signature) {
    return false;
  }

  // Compute expected signature
  const expected = await computeSignature(policy, publicKey || 'mock-key', signature.algorithm);

  // Compare
  return expected === signature.value;
}

/**
 * Compute a signature for a policy.
 *
 * In development, this is a mock implementation.
 * In production, this uses a cryptographic library (e.g., libsodium, AWS KMS).
 *
 * The signature is computed over:
 * 1. Policy metadata (id, version, jurisdiction)
 * 2. Rule graph (all rules and their dependencies)
 * 3. Input/output specifications
 *
 * NOT included: previous signatures (to allow incremental signing)
 *
 * @param policy - The policy to sign
 * @param key - The signing key
 * @param algorithm - Signature algorithm
 * @returns Base64-encoded signature
 */
async function computeSignature(
  policy: CompiledPolicy,
  key: string,
  algorithm: string = 'SHA256-ECDSA'
): Promise<string> {
  // Extract data to sign (exclude signatures)
  const dataToSign = {
    id: policy.id,
    version: policy.version,
    jurisdiction: policy.jurisdiction,
    metadata: policy.metadata,
    ruleGraph: policy.ruleGraph,
    inputs: policy.inputs,
    outputs: policy.outputs,
  };

  const json = JSON.stringify(dataToSign);

  // In production, use actual crypto library
  // For now, use a simple hash-based mock
  try {
    const cryptoModuleImport = (await import('crypto')) as any;
    if (cryptoModuleImport && typeof cryptoModuleImport.createHmac === 'function') {
      return cryptoModuleImport
        .createHmac('sha256', key)
        .update(json)
        .digest('base64');
    }
  } catch {
    // Crypto not available
  }

  // Mock implementation using Base64 encoding
  const mockSig = `${algorithm}:${json.slice(0, 32)}:${key.slice(0, 8)}`;
  return encodeToBase64(mockSig);
}

/**
 * Verify that a policy has been signed by all required actors.
 *
 * Requirements depend on context:
 * - Development: author signature only
 * - Staging: author + approver signatures
 * - Production: author + approver signatures
 *
 * @param policy - The policy to verify
 * @param requireApprover - Whether approver signature is required
 * @returns true if all required signatures are present
 */
export function hasRequiredSignatures(
  policy: CompiledPolicy,
  requireApprover: boolean = false
): boolean {
  // Always require author
  if (!policy.signatures || !policy.signatures.author) {
    return false;
  }

  // Require approver if specified
  if (requireApprover && !policy.signatures.approver) {
    return false;
  }

  return true;
}

/**
 * Extract signature metadata for audit trails.
 */
export interface SignatureMetadata {
  actor: Actor;
  algorithm: string;
  keyId: string;
  timestamp: Date;
}

/**
 * Get signature metadata for auditing.
 *
 * @param policy - The signed policy
 * @param role - Which signature to extract (author or approver)
 * @returns Signature metadata
 */
export function extractSignatureMetadata(
  policy: CompiledPolicy,
  role: 'author' | 'approver'
): SignatureMetadata | null {
  if (role === 'author') {
    if (!policy.signatures?.author || !policy.author) {
      return null;
    }
    return {
      actor: policy.author,
      algorithm: policy.signatures.author.algorithm,
      keyId: policy.signatures.author.publicKeyId,
      timestamp: policy.compiledAt,
    };
  }

  if (role === 'approver') {
    if (!policy.signatures?.approver || !policy.approver) {
      return null;
    }
    return {
      actor: policy.approver,
      algorithm: policy.signatures.approver.algorithm,
      keyId: policy.signatures.approver.publicKeyId,
      timestamp: policy.compiledAt, // Note: should track approval time separately
    };
  }

  return null;
}

/**
 * Audit trail entry for policy signatures.
 */
export interface SignatureAuditEntry {
  policyId: string;
  version: string;
  actor: Actor;
  role: 'author' | 'approver';
  algorithm: string;
  keyId: string;
  timestamp: Date;
  signatureValue: string;
}

/**
 * Create audit trail entry from a signed policy.
 *
 * @param policy - The signed policy
 * @param role - Which signature to audit
 * @returns Audit trail entry
 */
export function createSignatureAuditEntry(
  policy: CompiledPolicy,
  role: 'author' | 'approver'
): SignatureAuditEntry | null {
  const sig = extractSignatureMetadata(policy, role);
  if (!sig) return null;

  const sigValue = role === 'author' ? policy.signatures.author?.value : policy.signatures.approver?.value;

  return {
    policyId: policy.id,
    version: policy.version,
    actor: sig.actor,
    role,
    algorithm: sig.algorithm,
    keyId: sig.keyId,
    timestamp: sig.timestamp,
    signatureValue: sigValue || '',
  };
}

/**
 * Security context for signing operations.
 *
 * In production, this would integrate with:
 * - AWS KMS
 * - HashiCorp Vault
 * - Azure Key Vault
 * - or similar key management system
 */
export interface SigningContext {
  actor: Actor;
  keyId: string;
  algorithm: 'SHA256-RSA' | 'SHA256-ECDSA';
  isProduction: boolean;
}

/**
 * Create a signing context for policy operations.
 *
 * @param actor - The actor performing the signing
 * @param isProduction - Whether this is a production deployment
 * @returns Signing context
 */
export function createSigningContext(actor: Actor, isProduction: boolean = false): SigningContext {
  return {
    actor,
    keyId: `${actor.id}/${Date.now()}`,
    algorithm: 'SHA256-ECDSA',
    isProduction,
  };
}
