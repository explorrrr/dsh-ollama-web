import type { UpdateError, UpdateErrorCode } from './types.js';

/** A stable, client-facing update failure. Messages must not include secrets or file paths. */
export class UpdateFailure extends Error {
  readonly code: UpdateErrorCode;

  constructor(code: UpdateErrorCode, message: string, cause?: unknown) {
    super(message, cause === undefined ? undefined : { cause });
    this.name = 'UpdateFailure';
    this.code = code;
  }
}

export function isUpdateFailure(error: unknown): error is UpdateFailure {
  return error instanceof UpdateFailure;
}

/** Convert an arbitrary failure into the wire-safe error shape. */
export function toUpdateError(error: unknown): UpdateError {
  if (error instanceof UpdateFailure) {
    return { code: error.code, message: error.message };
  }
  return {
    code: 'unknown',
    message: error instanceof Error ? error.message : String(error),
  };
}
