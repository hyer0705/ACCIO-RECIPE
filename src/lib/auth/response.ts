import { NextResponse } from 'next/server';
import { isAccessControlError } from './errors';

interface AccessErrorResponseOptions {
  key?: 'message' | 'error';
  includeSuccess?: boolean;
}

export interface AccessControlErrorResponseBody {
  success?: false;
  message?: string;
  error?: string;
}

export function toAccessControlErrorResponse(
  error: unknown,
  options: AccessErrorResponseOptions = {},
): NextResponse<AccessControlErrorResponseBody> | null {
  if (!isAccessControlError(error)) {
    return null;
  }

  const { key = 'message', includeSuccess = key === 'message' } = options;
  const body: AccessControlErrorResponseBody = {
    [key]: error.message,
  };

  if (includeSuccess) {
    body.success = false;
  }

  return NextResponse.json(body, { status: error.status });
}
