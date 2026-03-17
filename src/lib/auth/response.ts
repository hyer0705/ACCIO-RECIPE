import { NextResponse } from 'next/server';
import { isAccessControlError } from './errors';

interface AccessErrorResponseOptions {
  key?: 'message' | 'error';
  includeSuccess?: boolean;
}

export function toAccessControlErrorResponse(
  error: unknown,
  options: AccessErrorResponseOptions = {},
) {
  if (!isAccessControlError(error)) {
    return null;
  }

  const { key = 'message', includeSuccess = key === 'message' } = options;
  const body: Record<string, boolean | string> = {
    [key]: error.message,
  };

  if (includeSuccess) {
    body.success = false;
  }

  return NextResponse.json(body, { status: error.status });
}
