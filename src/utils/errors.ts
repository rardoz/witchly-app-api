import { GraphQLError } from 'graphql';

export class CustomGraphQLError extends GraphQLError {
  constructor(message: string, code: string, statusCode: number = 400) {
    super(message, {
      extensions: {
        code,
        http: {
          status: statusCode,
        },
      },
    });
  }
}

// Specific error types
export class NotFoundError extends CustomGraphQLError {
  constructor(message: string = 'Resource not found') {
    super(message, 'NOT_FOUND', 404);
  }
}

export class ValidationError extends CustomGraphQLError {
  constructor(message: string = 'Validation failed') {
    super(message, 'VALIDATION_ERROR', 400);
  }
}

export class UnauthorizedError extends CustomGraphQLError {
  constructor(message: string = 'Unauthorized') {
    super(message, 'UNAUTHORIZED', 401);
  }
}

export class ForbiddenError extends CustomGraphQLError {
  constructor(message: string = 'Forbidden') {
    super(message, 'FORBIDDEN', 403);
  }
}

export class ConflictError extends CustomGraphQLError {
  constructor(message: string = 'Resource already exists') {
    super(message, 'CONFLICT', 409);
  }
}

export class InternalServerError extends CustomGraphQLError {
  constructor(message: string = 'Internal server error') {
    super(message, 'INTERNAL_SERVER_ERROR', 500);
  }
}

export function isMongoError(error: unknown): error is { code: number } {
  return (
    error !== null &&
    typeof error === 'object' &&
    'code' in error &&
    typeof (error as { code: unknown }).code === 'number'
  );
}
