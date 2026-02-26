import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import prisma from '@/lib/prisma';
import { cooking_logs_status } from '@/generated/client/enums';

/**
 * @swagger
 * /api/cooking-logs:
 *   get:
 *     summary: 전체 요리 기록 리스트 조회
 *     description: |
 *       현재 로그인한 사용자의 전체 요리 기록을 최신순으로 반환합니다.
 *       - 레시피 제목(`recipes.title`) 포함
 *       - 정렬: `cooked_at` 내림차순
 *     tags: [Logs]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 요리 기록 목록 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       log_id:
 *                         type: integer
 *                       recipe_id:
 *                         type: integer
 *                         nullable: true
 *                       recipe_title:
 *                         type: string
 *                         nullable: true
 *                       status:
 *                         type: string
 *                         enum: [SUCCESS, REGRET, FAIL]
 *                       lesson_note:
 *                         type: string
 *                         nullable: true
 *                       companion:
 *                         type: string
 *                         nullable: true
 *                       cooked_at:
 *                         type: string
 *                         format: date-time
 *                         nullable: true
 *       401:
 *         description: 인증 실패
 *       500:
 *         description: 서버 내부 오류
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !('id' in session.user)) {
      return NextResponse.json({ success: false, message: '인증이 필요합니다.' }, { status: 401 });
    }

    const userId = parseInt(session.user.id as string, 10);

    const logs = await prisma.cooking_logs.findMany({
      where: { user_id: userId },
      select: {
        log_id: true,
        recipe_id: true,
        status: true,
        lesson_note: true,
        companion: true,
        cooked_at: true,
        recipes: { select: { title: true } },
      },
      orderBy: { cooked_at: 'desc' },
    });

    const data = logs.map((log) => ({
      log_id: log.log_id,
      recipe_id: log.recipe_id,
      recipe_title: log.recipes?.title ?? null,
      status: log.status,
      lesson_note: log.lesson_note,
      companion: log.companion,
      cooked_at: log.cooked_at,
    }));

    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    console.error('GET /api/cooking-logs Error:', error);
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

/**
 * @swagger
 * /api/cooking-logs:
 *   post:
 *     summary: 요리 완료 후 새로운 요리 기록(Cooking Log) 작성
 *     description: |
 *       레시피를 따라 요리를 완료한 직후 노출되는 "요리 기록하기" 화면에서 호출됩니다.
 *       - `recipe_id`: 방금 완료한 레시피 ID (플로우상 항상 존재, 필수)
 *       - `status`: 요리 결과 (SUCCESS / REGRET / FAIL 중 하나, 필수)
 *       - `lesson_note`: 일기 형태의 요리 경험 기록 (필수, 빈 문자열 불가)
 *       - `companion`: 함께 먹은 사람 (선택, 직접 입력 포함, 최대 50자)
 *     tags: [Logs]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *               - recipe_id
 *               - lesson_note
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [SUCCESS, REGRET, FAIL]
 *                 example: SUCCESS
 *               recipe_id:
 *                 type: integer
 *                 example: 42
 *               lesson_note:
 *                 type: string
 *                 example: "양파를 5분 더 볶으니 단맛이 확 살아남. 기록해둘 것."
 *               companion:
 *                 type: string
 *                 example: 가족
 *     responses:
 *       201:
 *         description: 요리 기록 저장 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     log_id:
 *                       type: integer
 *                     recipe_id:
 *                       type: integer
 *                     status:
 *                       type: string
 *                     lesson_note:
 *                       type: string
 *                     companion:
 *                       type: string
 *                       nullable: true
 *                     cooked_at:
 *                       type: string
 *                       format: date-time
 *                       nullable: true
 *       400:
 *         description: 잘못된 요청 (필수 필드 누락, 유효하지 않은 값 등)
 *       401:
 *         description: 인증 실패
 *       404:
 *         description: 존재하지 않는 레시피
 *       500:
 *         description: 서버 내부 오류
 */

/** 허용된 status 값 */
const VALID_STATUS_VALUES = Object.values(cooking_logs_status);

interface CreateCookingLogBody {
  status: cooking_logs_status; // 필수
  recipe_id: number; // 필수 — 플로우상 항상 존재
  lesson_note: string; // 필수 — 일기 형태 자유 텍스트
  companion?: string; // 선택 — 최대 50자
}

export async function POST(req: Request) {
  try {
    // ── 1. 인증 ──────────────────────────────────────────────────────
    const session = await getServerSession(authOptions);

    if (!session || !session.user || !('id' in session.user)) {
      return NextResponse.json({ success: false, message: '인증이 필요합니다.' }, { status: 401 });
    }

    const userId = parseInt(session.user.id as string, 10);
    const body: CreateCookingLogBody = await req.json();

    // ── 2. 유효성 검사 ────────────────────────────────────────────────
    const errors: string[] = [];

    // status 검사
    if (!body.status || !VALID_STATUS_VALUES.includes(body.status)) {
      errors.push('status는 SUCCESS, REGRET, FAIL 중 하나여야 합니다.');
    }

    // recipe_id 검사
    if (body.recipe_id === undefined || body.recipe_id === null) {
      errors.push('recipe_id는 필수입니다.');
    } else if (!Number.isInteger(body.recipe_id) || body.recipe_id <= 0) {
      errors.push('recipe_id는 양의 정수여야 합니다.');
    }

    // lesson_note 검사
    if (
      !body.lesson_note ||
      typeof body.lesson_note !== 'string' ||
      body.lesson_note.trim() === ''
    ) {
      errors.push('lesson_note는 필수입니다.');
    }

    // companion 검사 (선택)
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

    // ── 3. recipe_id 존재 여부 검증 ───────────────────────────────────
    const existingRecipe = await prisma.recipes.findUnique({
      where: { recipe_id: body.recipe_id },
      select: { recipe_id: true },
    });

    if (!existingRecipe) {
      return NextResponse.json(
        { success: false, message: '존재하지 않는 레시피입니다.' },
        { status: 404 },
      );
    }

    // ── 4. cooking_logs 저장 ──────────────────────────────────────────
    const newLog = await prisma.cooking_logs.create({
      data: {
        user_id: userId,
        recipe_id: body.recipe_id,
        status: body.status,
        lesson_note: body.lesson_note.trim(),
        companion: body.companion?.trim() ?? null,
        // cooked_at: DB DEFAULT now() 사용
      },
      select: {
        log_id: true,
        recipe_id: true,
        status: true,
        lesson_note: true,
        companion: true,
        cooked_at: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: '요리 기록이 저장되었습니다.',
        data: newLog,
      },
      { status: 201 },
    );
  } catch (error: unknown) {
    console.error('POST /api/logs Error:', error);
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
