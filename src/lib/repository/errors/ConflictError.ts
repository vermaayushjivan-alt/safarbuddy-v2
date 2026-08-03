import { RepositoryError } from './RepositoryError';

/**
 * Conflict Error
 * Thrown when a resource already exists or conflicts with existing data
 */
export class ConflictError extends RepositoryError {
  constructor(
    message: string,
    details?: Record<string, unknown>
  ) {
    super(message, 'CONFLICT', 409, details);
  }

  /**
   * Resource already exists
   */
  static duplicate(
    resource: string,
    field: string,
    value: string | number
  ): ConflictError {
    return new ConflictError(
      `${resource} with ${field} '${value}' already exists`,
      {
        resource,
        field,
        value,
      }
    );
  }

  /**
   * Database unique constraint violation
   */
  static uniqueConstraint(
    constraint: string,
    details?: Record<string, unknown>
  ): ConflictError {
    return new ConflictError(
      `Unique constraint violation: ${constraint}`,
      {
        constraint,
        ...(details ?? {}),
      }
    );
  }
}
