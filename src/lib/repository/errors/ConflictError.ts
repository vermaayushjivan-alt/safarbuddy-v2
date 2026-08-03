import { RepositoryError } from './RepositoryError';

/**
 * Conflict Error
 * Thrown when a resource already exists or conflicts with existing data
 */
export class ConflictError extends RepositoryError {
  constructor(message: string, details?: unknown) {
    super(message, 'CONFLICT', 409, details);
  }

  static duplicate(resource: string, field: string, value: string | number) {
    return new ConflictError(
      `${resource} with ${field} '${value}' already exists`,
      { resource, field, value }
    );
  }

  static uniqueConstraint(constraint: string, details?: unknown) {
    return new ConflictError(
      `Unique constraint violation: ${constraint}`,
      { constraint, ...details }
    );
  }
}
