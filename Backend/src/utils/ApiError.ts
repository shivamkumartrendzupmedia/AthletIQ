/**
 * Custom operational error class for consistent API error responses
 */
export class ApiError extends Error {
  public statusCode: number;
  public errors?: unknown[];

  constructor(statusCode: number, message: string, errors?: unknown[]) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message = 'Bad Request', errors?: unknown[]): ApiError {
    return new ApiError(400, message, errors);
  }

  static unauthorized(message = 'Unauthorized'): ApiError {
    return new ApiError(401, message);
  }

  static forbidden(message = 'Forbidden'): ApiError {
    return new ApiError(403, message);
  }

  static notFound(message = 'Resource not found'): ApiError {
    return new ApiError(404, message);
  }

  static conflict(message = 'Conflict'): ApiError {
    return new ApiError(409, message);
  }

  static internal(message = 'Internal Server Error'): ApiError {
    return new ApiError(500, message);
  }
}
