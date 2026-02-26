import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import prisma from '@/lib/prisma';
import { cooking_logs_status } from '@/generated/client/enums';

/**
 * @swagger
 * /api/cooking-logs/{log_id}:
 *   put:
 *     summary: 요리 기록 수정
 *     description: |
 *       자신이 작성한 요리 기록의 status, lesson_note, companion을 수정합니다.
 *       - 자신의 기록만 수정 가능 (타인의 log_id 요청 시 403)
 *       - 보내지 않은 필드는 변경되지 않음 (PATCH 방식 적용)
 *     tags: [Logs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: log_id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [SUCCESS, REGRET, FAIL]
 *               lesson_note:
 *                 type: string
 *               companion:
 *                 type: string
 *     responses:
 *       200:
 *         description: 수정 성공
 *       400:
 *         description: 잘못된 요청
 *       401:
 *         description: 인증 실패
 *       403:
 *         description: 권한 없음
 *       404:
 *         description: 존재하지 않는 기록
 *       500:
 *         description: 서버 내부 오류
 *   delete:
 *     summary: 요리 기록 삭제
 *     description: 자신이 작성한 요리 기록을 삭제합니다.
 *     tags: [Logs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: log_id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: 삭제 성공
 *       401:
 *         description: 인증 실패
 *       403:
 *         description: 권한 없음
 *       404:
 *         description: 존재하지 않는 기록
 *       500:
 *         description: 서버 내부 오류
 */

const VALID_STATUS_VALUES = Object.values(cooking_logs_status);

interface UpdateLogBody {
  status?: cooking_logs_status;
  lesson_note?: string;
  companion?: string;
}

interface RouteContext {
  params: Promise<{ log_id: string }>;
}

export async function PUT(req: Request, context: RouteContext) {
  try {
    // ── 1. 인증 ──────────────────────────────────────────────────────
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !('id' in session.user)) {
      return NextResponse.json({ success: false, message: '인증이 필요합니다.' }, { status: 401 });
    }

    const userId = parseInt(session.user.id as string, 10);
    const { log_id: logIdParam } = await context.params;
    const logId = parseInt(logIdParam, 10);

    if (isNaN(logId) || logId <= 0) {
      return NextResponse.json(
        { success: false, message: '유효하지 않은 log_id입니다.' },
        { status: 400 },
      );
    }

    // ── 2. 기록 존재 및 소유자 확인 ────────────────────────────────────
    const existing = await prisma.cooking_logs.findUnique({
      where: { log_id: logId },
      select: { log_id: true, user_id: true },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, message: '존재하지 않는 요리 기록입니다.' },
        { status: 404 },
      );
    }

    if (existing.user_id !== userId) {
      return NextResponse.json(
        { success: false, message: '수정 권한이 없습니다.' },
        { status: 403 },
      );
    }

    // ── 3. 입력값 검증 ────────────────────────────────────────────────
    const body: UpdateLogBody = await req.json();
    const errors: string[] = [];

    if (body.status !== undefined && !VALID_STATUS_VALUES.includes(body.status)) {
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

    // ── 4. 업데이트 ───────────────────────────────────────────────────
    const updateData: {
      status?: cooking_logs_status;
      lesson_note?: string;
      companion?: string | null;
    } = {};

    if (body.status !== undefined) updateData.status = body.status;
    if (body.lesson_note !== undefined) updateData.lesson_note = body.lesson_note.trim();
    if (body.companion !== undefined) updateData.companion = body.companion.trim() || null;

    const updated = await prisma.cooking_logs.update({
      where: { log_id: logId },
      data: updateData,
      select: {
        log_id: true,
        recipe_id: true,
        status: true,
        lesson_note: true,
        companion: true,
        cooked_at: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: '요리 기록이 수정되었습니다.',
      data: updated,
    });
  } catch (error: unknown) {
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
    // ── 1. 인증 ──────────────────────────────────────────────────────
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !('id' in session.user)) {
      return NextResponse.json({ success: false, message: '인증이 필요합니다.' }, { status: 401 });
    }

    const userId = parseInt(session.user.id as string, 10);
    const { log_id: logIdParam } = await context.params;
    const logId = parseInt(logIdParam, 10);

    if (isNaN(logId) || logId <= 0) {
      return NextResponse.json(
        { success: false, message: '유효하지 않은 log_id입니다.' },
        { status: 400 },
      );
    }

    // ── 2. 기록 존재 및 소유자 확인 ────────────────────────────────────
    const existing = await prisma.cooking_logs.findUnique({
      where: { log_id: logId },
      select: { log_id: true, user_id: true },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, message: '존재하지 않는 요리 기록입니다.' },
        { status: 404 },
      );
    }

    if (existing.user_id !== userId) {
      return NextResponse.json(
        { success: false, message: '삭제 권한이 없습니다.' },
        { status: 403 },
      );
    }

    // ── 3. 삭제 ──────────────────────────────────────────────────────
    await prisma.cooking_logs.delete({ where: { log_id: logId } });

    return NextResponse.json({ success: true, message: '요리 기록이 삭제되었습니다.' });
  } catch (error: unknown) {
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
