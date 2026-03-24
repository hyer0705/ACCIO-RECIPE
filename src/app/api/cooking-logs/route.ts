import { NextResponse } from 'next/server';
import { requireSessionUser } from '@/lib/auth/session';
import { toAccessControlErrorResponse } from '@/lib/auth/response';
import { cooking_logs_status } from '@/generated/client/enums';
import * as cookingLogService from '@/services/cookingLogService';

/** 허용된 status 값 */
const VALID_STATUS_VALUES = Object.values(cooking_logs_status);

/**
 * @swagger
 * /api/cooking-logs:
 *   get:
 *     summary: 전체 요리 기록 리스트 조회
 */
export async function GET() {
  try {
    const { userId } = await requireSessionUser();
    const data = await cookingLogService.getCookingLogs(userId);

    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    const accessErrorResponse = toAccessControlErrorResponse(error);
    if (accessErrorResponse) {
      return accessErrorResponse;
    }

    console.error('GET /api/cooking-logs Error:', error);
    return NextResponse.json(
      {
        success: false,
        message: '서버 에러가 발생했습니다.',
        error: 'Internal Server Error',
      },
      { status: 500 },
    );
  }
}

/**
 * @swagger
 * /api/cooking-logs:
 *   post:
 *     summary: 요리 완료 후 새로운 요리 기록(Cooking Log) 작성
 */
export async function POST(req: Request) {
  try {
    const { userId } = await requireSessionUser();
    const body: Record<string, unknown> = await req.json();

    // ── 1. 입력 유효성 검사 (핸들러 레벨) ───────────────────────────
    const errors: string[] = [];

    if (
      !body.status ||
      typeof body.status !== 'string' ||
      !VALID_STATUS_VALUES.includes(body.status as cooking_logs_status)
    ) {
      errors.push('status는 SUCCESS, REGRET, FAIL 중 하나여야 합니다.');
    }

    if (body.recipe_id === undefined || body.recipe_id === null) {
      errors.push('recipe_id는 필수입니다.');
    } else if (
      typeof body.recipe_id !== 'number' ||
      !Number.isInteger(body.recipe_id) ||
      body.recipe_id <= 0
    ) {
      errors.push('recipe_id는 양의 정수여야 합니다.');
    }

    if (
      body.lesson_note === undefined ||
      body.lesson_note === null ||
      typeof body.lesson_note !== 'string' ||
      body.lesson_note.trim().length === 0
    ) {
      errors.push('lesson_note는 필수입니다.');
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

    // ── 2. 서비스 호출 ──────────────────────────────────────────────
    try {
      const newLog = await cookingLogService.createCookingLog(userId, {
        recipe_id: body.recipe_id as number,
        status: body.status as cooking_logs_status,
        lesson_note: body.lesson_note as string,
        companion: body.companion as string | undefined,
      });

      return NextResponse.json(
        {
          success: true,
          message: '요리 기록이 저장되었습니다.',
          data: newLog,
        },
        { status: 201 },
      );
    } catch (e: unknown) {
      if (e instanceof Error && e.message === '존재하지 않는 레시피입니다.') {
        return NextResponse.json({ success: false, message: e.message }, { status: 404 });
      }
      throw e;
    }
  } catch (error: unknown) {
    const accessErrorResponse = toAccessControlErrorResponse(error);
    if (accessErrorResponse) {
      return accessErrorResponse;
    }

    console.error('POST /api/cooking-logs Error:', error);
    return NextResponse.json(
      {
        success: false,
        message: '서버 에러가 발생했습니다.',
        error: 'Internal Server Error',
      },
      { status: 500 },
    );
  }
}
