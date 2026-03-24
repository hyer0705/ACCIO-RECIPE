import { NextResponse } from 'next/server';
import { requireSessionUser } from '@/lib/auth/session';
import { toAccessControlErrorResponse } from '@/lib/auth/response';
import { formatLocalDate, getTodayInLocalTime, parseAndValidateLocalDate } from '@/lib/localDate';
import * as fridgeService from '@/services/fridgeService';

interface RouteContext {
  params: Promise<{ item_id: string }>;
}

function parseItemId(itemIdParam: string): { itemId: number } | { error: NextResponse } {
  if (!/^\d+$/.test(itemIdParam)) {
    return {
      error: NextResponse.json(
        { success: false, message: '유효하지 않은 item_id입니다.' },
        { status: 400 },
      ),
    };
  }

  const itemId = Number(itemIdParam);
  if (itemId <= 0) {
    return {
      error: NextResponse.json(
        { success: false, message: '유효하지 않은 item_id입니다.' },
        { status: 400 },
      ),
    };
  }

  return { itemId };
}

export async function PUT(req: Request, context: RouteContext) {
  try {
    const { userId } = await requireSessionUser();
    const { item_id: itemIdParam } = await context.params;
    const parsedItemId = parseItemId(itemIdParam);
    if ('error' in parsedItemId) {
      return parsedItemId.error;
    }
    const { itemId } = parsedItemId;

    let parsedBody: unknown;
    try {
      parsedBody = await req.json();
    } catch {
      return NextResponse.json(
        { success: false, message: '잘못된 JSON 형식입니다.' },
        { status: 400 },
      );
    }

    if (!parsedBody || typeof parsedBody !== 'object' || Array.isArray(parsedBody)) {
      return NextResponse.json(
        { success: false, message: '잘못된 요청 형식입니다.' },
        { status: 400 },
      );
    }

    const body = parsedBody as Record<string, unknown>;
    const errors: string[] = [];

    if (body.quantity !== undefined && (typeof body.quantity !== 'number' || body.quantity <= 0)) {
      errors.push('수량(quantity)은 0보다 큰 숫자여야 합니다.');
    }
    if (body.unit !== undefined && typeof body.unit !== 'string') {
      errors.push('단위(unit)는 문자열이어야 합니다.');
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

    const updated = await fridgeService.updateFridgeItem(
      userId,
      itemId,
      body as {
        quantity?: number;
        unit?: string;
        expiry_date?: string;
      },
    );
    return NextResponse.json({
      success: true,
      message: '재료 정보가 수정되었습니다.',
      data: {
        ...updated,
        quantity: updated.quantity !== null ? Number(updated.quantity) : null,
        expiry_date: updated.expiry_date ? formatLocalDate(updated.expiry_date) : null,
      },
    });
  } catch (error: unknown) {
    const accessErrorResponse = toAccessControlErrorResponse(error);
    if (accessErrorResponse) {
      return accessErrorResponse;
    }

    console.error('PUT /api/fridge/[item_id] Error:', error);
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

export async function DELETE(_req: Request, context: RouteContext) {
  try {
    const { userId } = await requireSessionUser();
    const { item_id: itemIdParam } = await context.params;
    const parsedItemId = parseItemId(itemIdParam);
    if ('error' in parsedItemId) {
      return parsedItemId.error;
    }
    const { itemId } = parsedItemId;

    await fridgeService.deleteFridgeItem(userId, itemId);
    return NextResponse.json({ success: true, message: '재료가 삭제되었습니다.' });
  } catch (error: unknown) {
    const accessErrorResponse = toAccessControlErrorResponse(error);
    if (accessErrorResponse) {
      return accessErrorResponse;
    }

    console.error('DELETE /api/fridge/[item_id] Error:', error);
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
