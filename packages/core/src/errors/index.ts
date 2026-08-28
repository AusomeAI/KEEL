/**
 * Error types for the deterministic core
 *
 * All errors are typed and deterministic.
 * No nondeterministic error messages or stack traces in critical paths.
 */

/**
 * AuthenticationError — failed to authenticate the actor
 */
export class AuthenticationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthenticationError";
  }
}

/**
 * AuthorizationError — actor lacks permission for this action
 */
export class AuthorizationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthorizationError";
  }
}

/**
 * AutonomyError — action exceeds agent autonomy ceiling
 */
export class AutonomyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AutonomyError";
  }
}

/**
 * ValidationError — input failed schema validation
 */
export class ValidationError extends Error {
  constructor(
    message: string,
    readonly path?: string[]
  ) {
    super(message);
    this.name = "ValidationError";
  }
}

/**
 * PolicyError — policy compilation or execution error
 */
export class PolicyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PolicyError";
  }
}

/**
 * LedgerError — event store operation failed
 */
export class LedgerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LedgerError";
  }
}

/**
 * TenancyError — tenant isolation or tenancy kernel error
 */
export class TenancyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TenancyError";
  }
}

/**
 * ControlGateError — Control Gate business logic error
 */
export class ControlGateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ControlGateError";
  }
}
