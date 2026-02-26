import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import prisma from '@/lib/prisma';

/**
 * @swagger
 * /api/fridge/{item_id}:
 *   put:
 *     summary: 냉장고 재료 정보 수정
 *     description: |
 *       냉장고에 등록된 특정 재료의 수량, 단위, 유통기한을 수정합니다.
 *       - 자신의 재료만 수정 가능 (타인의 item_id 요청 시 403)
 *       - 필드를 보내지 않으면 해당 필드는 변경되지 않습니다 (PATCH 방식 적용)
 *     tags: [Fridge]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: item_id
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
 *               quantity:
 *                 type: number
 *                 example: 3
 *               unit:
 *                 type: string
 *                 example: 개
 *               expiry_date:
 *                 type: string
 *                 format: date
 *                 example: "2026-03-10"
 *     responses:
 *       200:
 *         description: 수정 성공
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
 *       400:
 *         description: 잘못된 요청
 *       401:
 *         description: 인증 실패
 *       403:
 *         description: 권한 없음 (타인의 재료)
 *       404:
 *         description: 존재하지 않는 재료
 *       500:
 *         description: 서버 내부 오류
 *   delete:
 *     summary: 냉장고 재료 삭제
 *     description: 냉장고에서 특정 재료를 삭제합니다. 자신의 재료만 삭제 가능합니다.
 *     tags: [Fridge]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: item_id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: 삭제 성공
 *       401:
 *         description: 인증 실패
 *       403:
 *         description: 권한 없음 (타인의 재료)
 *       404:
 *         description: 존재하지 않는 재료
 *       500:
 *         description: 서버 내부 오류
 */

interface UpdateFridgeItemBody {
  quantity?: number;
  unit?: string;
  expiry_date?: string; // "YYYY-MM-DD"
}

function isValidDateString(value: string): boolean {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(value)) return false;
  const date = new Date(value);
  return !isNaN(date.getTime());
}

interface RouteContext {
  params: Promise<{ item_id: string }>;
}

export async function PUT(req: Request, context: RouteContext) {
  try {
    // ── 1. 인증 ──────────────────────────────────────────────────────
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !('id' in session.user)) {
      return NextResponse.json({ success: false, message: '인증이 필요합니다.' }, { status: 401 });
    }

    const userId = parseInt(session.user.id as string, 10);
    const { item_id: itemIdParam } = await context.params;
    const itemId = parseInt(itemIdParam, 10);

    if (isNaN(itemId) || itemId <= 0) {
      return NextResponse.json(
        { success: false, message: '유효하지 않은 item_id입니다.' },
        { status: 400 },
      );
    }

    // ── 2. 재료 존재 및 소유자 확인 ──────────────────────────────────
    const existing = await prisma.fridge_items.findUnique({
      where: { item_id: itemId },
      select: { item_id: true, user_id: true },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, message: '존재하지 않는 재료입니다.' },
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
    const body: UpdateFridgeItemBody = await req.json();
    const errors: string[] = [];

    if (body.quantity !== undefined) {
      if (typeof body.quantity !== 'number' || body.quantity <= 0) {
        errors.push('수량(quantity)은 0보다 큰 숫자여야 합니다.');
      }
    }

    if (body.expiry_date !== undefined) {
      if (!isValidDateString(body.expiry_date)) {
        errors.push('유통기한(expiry_date)은 YYYY-MM-DD 형식이어야 합니다.');
      }
    }

    if (errors.length > 0) {
      return NextResponse.json(
        { success: false, message: '잘못된 입력 데이터입니다.', errors },
        { status: 400 },
      );
    }

    // ── 4. 업데이트 (변경된 필드만) ───────────────────────────────────
    const updateData: {
      quantity?: number;
      unit?: string | null;
      expiry_date?: Date | null;
    } = {};

    if (body.quantity !== undefined) updateData.quantity = body.quantity;
    if (body.unit !== undefined) updateData.unit = body.unit.trim() || null;
    if (body.expiry_date !== undefined) {
      updateData.expiry_date = body.expiry_date ? new Date(body.expiry_date) : null;
    }

    const updated = await prisma.fridge_items.update({
      where: { item_id: itemId },
      data: updateData,
      select: {
        item_id: true,
        custom_name: true,
        quantity: true,
        unit: true,
        expiry_date: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: '재료 정보가 수정되었습니다.',
      data: {
        ...updated,
        quantity: updated.quantity !== null ? Number(updated.quantity) : null,
        expiry_date: updated.expiry_date ? updated.expiry_date.toISOString().split('T')[0] : null,
      },
    });
  } catch (error: unknown) {
    console.error('PUT /api/fridge/[item_id] Error:', error);
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
    const { item_id: itemIdParam } = await context.params;
    const itemId = parseInt(itemIdParam, 10);

    if (isNaN(itemId) || itemId <= 0) {
      return NextResponse.json(
        { success: false, message: '유효하지 않은 item_id입니다.' },
        { status: 400 },
      );
    }

    // ── 2. 재료 존재 및 소유자 확인 ──────────────────────────────────
    const existing = await prisma.fridge_items.findUnique({
      where: { item_id: itemId },
      select: { item_id: true, user_id: true },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, message: '존재하지 않는 재료입니다.' },
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
    await prisma.fridge_items.delete({ where: { item_id: itemId } });

    return NextResponse.json({
      success: true,
      message: '재료가 삭제되었습니다.',
    });
  } catch (error: unknown) {
    console.error('DELETE /api/fridge/[item_id] Error:', error);
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
