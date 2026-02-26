import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import prisma from '@/lib/prisma';

/**
 * @swagger
 * /api/fridge:
 *   post:
 *     summary: 냉장고에 새로운 식재료 추가
 *     description: |
 *       재료 이름, 수량, 단위, 유통기한을 입력받아 내 냉장고(fridge_items)에 저장합니다.
 *       - `ingredients_master`에 동일한 이름이 존재하면 `master_id`를 연결합니다.
 *       - 마스터에 없는 재료는 `custom_name`으로 저장됩니다.
 *       - 유통기한(`expiry_date`)을 입력하지 않으면 마스터의 `base_shelf_life`(일)를 기준으로 자동 계산합니다.
 *     tags: [Fridge]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 example: 대파
 *               quantity:
 *                 type: number
 *                 example: 2
 *               unit:
 *                 type: string
 *                 example: 개
 *               expiry_date:
 *                 type: string
 *                 format: date
 *                 example: "2026-03-05"
 *     responses:
 *       201:
 *         description: 식재료 추가 성공
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
 *                     item_id:
 *                       type: integer
 *                     custom_name:
 *                       type: string
 *                       nullable: true
 *                     master_id:
 *                       type: integer
 *                       nullable: true
 *                     quantity:
 *                       type: number
 *                       nullable: true
 *                     unit:
 *                       type: string
 *                       nullable: true
 *                     expiry_date:
 *                       type: string
 *                       nullable: true
 *       400:
 *         description: 잘못된 요청 (재료 이름 누락, 유효하지 않은 날짜 등)
 *       401:
 *         description: 인증 실패
 *       500:
 *         description: 서버 내부 오류
 */

interface CreateFridgeItemBody {
  name: string;
  quantity?: number;
  unit?: string;
  expiry_date?: string; // "YYYY-MM-DD"
}

/**
 * 문자열이 유효한 YYYY-MM-DD 날짜 형식인지 확인합니다.
 */
function isValidDateString(value: string): boolean {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(value)) return false;
  const date = new Date(value);
  return !isNaN(date.getTime());
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || !('id' in session.user)) {
      return NextResponse.json({ success: false, message: '인증이 필요합니다.' }, { status: 401 });
    }

    const userId = parseInt(session.user.id as string, 10);
    const body: CreateFridgeItemBody = await req.json();

    // ── 1. 입력값 검증 ───────────────────────────────────────────────
    const errors: string[] = [];

    if (!body.name || typeof body.name !== 'string' || body.name.trim() === '') {
      errors.push('재료 이름(name)은 필수입니다.');
    }

    if (body.quantity !== undefined) {
      if (typeof body.quantity !== 'number' || body.quantity <= 0) {
        errors.push('수량(quantity)은 0보다 큰 숫자여야 합니다.');
      }
    }

    // 유통기한 입력 시: 형식 및 과거 날짜 검증
    if (body.expiry_date !== undefined) {
      if (!isValidDateString(body.expiry_date)) {
        errors.push('유통기한(expiry_date)은 YYYY-MM-DD 형식이어야 합니다.');
      } else {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const inputDate = new Date(body.expiry_date);
        if (inputDate < today) {
          errors.push('유통기한(expiry_date)은 오늘 이후 날짜여야 합니다.');
        }
      }
    }

    if (errors.length > 0) {
      return NextResponse.json(
        { success: false, message: '잘못된 입력 데이터입니다.', errors },
        { status: 400 },
      );
    }

    const name = body.name.trim();

    // ── 2. ingredients_master 조회 ────────────────────────────────────
    const master = await prisma.ingredients_master.findFirst({
      where: {
        name: {
          equals: name,
          // MySQL의 경우 collation이 case-insensitive이면 mode 불필요하지만 명시
        },
      },
      select: {
        master_id: true,
        default_unit: true,
        base_shelf_life: true,
      },
    });

    // ── 3. expiry_date 결정 ──────────────────────────────────────────
    let resolvedExpiryDate: Date | null = null;

    if (body.expiry_date !== undefined) {
      // 사용자가 직접 입력한 경우
      resolvedExpiryDate = new Date(body.expiry_date);
    } else if (master?.base_shelf_life != null) {
      // 마스터에서 base_shelf_life 자동 계산
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      today.setDate(today.getDate() + master.base_shelf_life);
      resolvedExpiryDate = today;
    }
    // 두 경우 모두 해당하지 않으면 null 유지

    // ── 4. unit 결정: 입력값 우선, 없으면 마스터 default_unit ─────────
    const resolvedUnit = body.unit?.trim() ?? master?.default_unit ?? null;

    // ── 5. fridge_items 저장 ─────────────────────────────────────────
    const newItem = await prisma.fridge_items.create({
      data: {
        user_id: userId,
        master_id: master?.master_id ?? null,
        custom_name: master ? null : name,
        quantity: body.quantity ?? 1,
        unit: resolvedUnit,
        expiry_date: resolvedExpiryDate,
      },
      select: {
        item_id: true,
        master_id: true,
        custom_name: true,
        quantity: true,
        unit: true,
        expiry_date: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: '식재료가 성공적으로 추가되었습니다.',
        data: newItem,
      },
      { status: 201 },
    );
  } catch (error: unknown) {
    console.error('POST /api/fridge Error:', error);
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
