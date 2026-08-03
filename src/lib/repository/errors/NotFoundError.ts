import { RepositoryError } from './RepositoryError';

/**
 * Not Found Error
 * Thrown when a requested resource does not exist
 */
export class NotFoundError extends RepositoryError {
  constructor(resource: string, identifier?: string | number, details?: unknown) {
    const message = identifier
      ? `${resource} with identifier '${identifier}' not found`
      : `${resource} not found`;

    super(message, 'NOT_FOUND', 404, details);
  }
}
