export type AccessControlCode = 'UNAUTHORIZED' | 'FORBIDDEN' | 'NOT_FOUND';

export class AccessControlError extends Error {
  constructor(
    public readonly code: AccessControlCode,
    public readonly status: 401 | 403 | 404,
    message: string,
  ) {
    super(message);
    this.name = 'AccessControlError';
  }
}

export function unauthorized(message = '인증이 필요합니다.') {
  return new AccessControlError('UNAUTHORIZED', 401, message);
}

export function forbidden(message = '접근 권한이 없습니다.') {
  return new AccessControlError('FORBIDDEN', 403, message);
}

export function notFound(message = '리소스를 찾을 수 없습니다.') {
  return new AccessControlError('NOT_FOUND', 404, message);
}

export function isAccessControlError(error: unknown): error is AccessControlError {
  return error instanceof AccessControlError;
}
