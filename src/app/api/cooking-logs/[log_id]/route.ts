import { NextResponse } from 'next/server';
import { requireSessionUser } from '@/lib/auth/session';
import { toAccessControlErrorResponse } from '@/lib/auth/response';
import { cooking_logs_status } from '@/generated/client/enums';
import * as cookingLogService from '@/services/cookingLogService';

const VALID_STATUS_VALUES = Object.values(cooking_logs_status);

interface RouteContext {
  params: Promise<{ log_id: string }>;
}

export async function PUT(req: Request, context: RouteContext) {
  try {
    const { userId } = await requireSessionUser();
    const { log_id: logIdParam } = await context.params;
    const logId = parseInt(logIdParam, 10);

    if (isNaN(logId) || logId <= 0) {
      return NextResponse.json(
        { success: false, message: '유효하지 않은 log_id입니다.' },
        { status: 400 },
      );
    }

    const body: Record<string, unknown> = await req.json();
    const errors: string[] = [];

    if (
      body.status !== undefined &&
      (typeof body.status !== 'string' ||
        !VALID_STATUS_VALUES.includes(body.status as cooking_logs_status))
    ) {
      errors.push('status는 SUCCESS, REGRET, FAIL 중 하나여야 합니다.');
    }

    if (body.lesson_note !== undefined) {
      if (typeof body.lesson_note !== 'string' || body.lesson_note.trim() === '') {
        errors.push('lesson_note는 빈 문자열이 될 수 없습니다.');
      }
    }

    if (body.companion !== undefined) {
      if (typeof body.companion !== 'string' || body.companion.trim().length > 50) {
        errors.push('companion은 50자 이하여야 합니다.');
      }
    }

    if (errors.length > 0) {
      return NextResponse.json(
        { success: false, message: '잘못된 입력 데이터입니다.', errors },
        { status: 400 },
      );
    }

    const updated = await cookingLogService.updateCookingLog(
      logId,
      userId,
      body as unknown as Partial<cookingLogService.CreateCookingLogData>,
    );
    return NextResponse.json({
      success: true,
      message: '요리 기록이 수정되었습니다.',
      data: updated,
    });
  } catch (error: unknown) {
    const accessErrorResponse = toAccessControlErrorResponse(error);
    if (accessErrorResponse) {
      return accessErrorResponse;
    }

    console.error('PUT /api/cooking-logs/[log_id] Error:', error);
    return NextResponse.json(
      {
        success: false,
        message: '서버 에러가 발생했습니다.',
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}

export async function DELETE(_req: Request, context: RouteContext) {
  try {
    const { userId } = await requireSessionUser();
    const { log_id: logIdParam } = await context.params;
    const logId = parseInt(logIdParam, 10);

    if (isNaN(logId) || logId <= 0) {
      return NextResponse.json(
        { success: false, message: '유효하지 않은 log_id입니다.' },
        { status: 400 },
      );
    }

    await cookingLogService.deleteCookingLog(logId, userId);
    return NextResponse.json({ success: true, message: '요리 기록이 삭제되었습니다.' });
  } catch (error: unknown) {
    const accessErrorResponse = toAccessControlErrorResponse(error);
    if (accessErrorResponse) {
      return accessErrorResponse;
    }

    console.error('DELETE /api/cooking-logs/[log_id] Error:', error);
    return NextResponse.json(
      {
        success: false,
        message: '서버 에러가 발생했습니다.',
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
