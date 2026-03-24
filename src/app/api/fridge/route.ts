import { NextResponse } from 'next/server';
import { requireSessionUser } from '@/lib/auth/session';
import { toAccessControlErrorResponse } from '@/lib/auth/response';
import { getTodayInLocalTime, parseAndValidateLocalDate } from '@/lib/localDate';
import * as fridgeService from '@/services/fridgeService';

/**
 * @swagger
 * /api/fridge:
 *   get:
 *     summary: 내 냉장고 재료 목록 전체 조회
 */
export async function GET() {
  try {
    const { userId } = await requireSessionUser();
    const data = await fridgeService.getFridgeItems(userId);

    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    const accessErrorResponse = toAccessControlErrorResponse(error);
    if (accessErrorResponse) {
      return accessErrorResponse;
    }

    console.error('GET /api/fridge Error:', error);
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
 * /api/fridge:
 *   post:
 *     summary: 냉장고에 새로운 식재료 추가
 */
export async function POST(req: Request) {
  try {
    const { userId } = await requireSessionUser();
    let body: Record<string, unknown>;
    try {
      const parsedBody = await req.json();
      if (!parsedBody || typeof parsedBody !== 'object' || Array.isArray(parsedBody)) {
        return NextResponse.json(
          { success: false, message: '잘못된 요청 형식입니다.' },
          { status: 400 },
        );
      }
      body = parsedBody as Record<string, unknown>;
    } catch {
      return NextResponse.json({ success: false, message: 'Invalid JSON body' }, { status: 400 });
    }

    // ── 1. 입력값 검증 ───────────────────────────────────────────────
    const errors: string[] = [];
    if (!body.name || typeof body.name !== 'string' || body.name.trim() === '') {
      errors.push('재료 이름(name)은 필수입니다.');
    }
    const trimmedName = typeof body.name === 'string' ? body.name.trim() : body.name;
    if (body.quantity !== undefined && (typeof body.quantity !== 'number' || body.quantity <= 0)) {
      errors.push('수량(quantity)은 0보다 큰 숫자여야 합니다.');
    }
    if (body.expiry_date !== undefined) {
      if (typeof body.expiry_date !== 'string') {
        errors.push('유통기한(expiry_date)은 YYYY-MM-DD 형식이어야 합니다.');
      } else {
        try {
          const expiryDate = parseAndValidateLocalDate(body.expiry_date);
          const today = getTodayInLocalTime();

          if (expiryDate < today) {
            errors.push('유통기한(expiry_date)은 오늘 이후 날짜여야 합니다.');
          }
        } catch {
          errors.push('유통기한(expiry_date)은 YYYY-MM-DD 형식이어야 합니다.');
        }
      }
    }

    if (errors.length > 0) {
      return NextResponse.json(
        { success: false, message: '잘못된 입력 데이터입니다.', errors },
        { status: 400 },
      );
    }

    // ── 2. 서비스 호출 ────────────────────────────────────────────────
    const newItem = await fridgeService.addFridgeItem(userId, {
      name: trimmedName as string,
      quantity: typeof body.quantity === 'number' ? body.quantity : undefined,
      unit: typeof body.unit === 'string' ? body.unit : undefined,
      expiry_date: typeof body.expiry_date === 'string' ? body.expiry_date : undefined,
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
    const accessErrorResponse = toAccessControlErrorResponse(error);
    if (accessErrorResponse) {
      return accessErrorResponse;
    }

    console.error('POST /api/fridge Error:', error);
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
