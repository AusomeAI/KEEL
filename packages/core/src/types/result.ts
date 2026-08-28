/**
 * Result type for recoverable errors
 *
 * Used throughout the control gate and deterministic core to represent
 * operations that can fail without crashing the system.
 */

import { z } from "zod";

/**
 * Ok<T> — successful result
 */
export class Ok<T> {
  constructor(readonly value: T) {}

  isOk(): this is Ok<T> {
    return true;
  }

  isErr(): this is Err<never> {
    return false;
  }

  map<U>(f: (value: T) => U): Result<U> {
    return new Ok(f(this.value));
  }

  flatMap<U>(f: (value: T) => Result<U>): Result<U> {
    return f(this.value);
  }

  getOrElse(fallback: T): T {
    return this.value;
  }

  fold<U>(onErr: (error: string) => U, onOk: (value: T) => U): U {
    return onOk(this.value);
  }
}

/**
 * Err<E> — failed result
 */
export class Err<E extends string = string> {
  constructor(readonly error: E) {}

  isOk(): this is Ok<never> {
    return false;
  }

  isErr(): this is Err<E> {
    return true;
  }

  map<U>(_f: (value: never) => U): Result<U> {
    return this as any;
  }

  flatMap<U>(_f: (value: never) => Result<U>): Result<U> {
    return this as any;
  }

  getOrElse(fallback: never): never {
    throw new Error(this.error);
  }

  fold<U>(onErr: (error: E) => U, _onOk: (value: never) => U): U {
    return onErr(this.error);
  }
}

export type Result<T, E extends string = string> = Ok<T> | Err<E>;

export function ok<T>(value: T): Ok<T> {
  return new Ok(value);
}

export function err<E extends string = string>(error: E): Err<E> {
  return new Err(error);
}

/**
 * Collect results — if all Ok, return array of values; otherwise return first error
 */
export function collect<T>(results: Result<T>[]): Result<T[]> {
  const values: T[] = [];
  for (const result of results) {
    if (result.isErr()) {
      return result;
    }
    values.push(result.value);
  }
  return ok(values);
}
