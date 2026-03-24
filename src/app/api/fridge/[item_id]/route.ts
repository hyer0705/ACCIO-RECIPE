import { NextResponse } from 'next/server';
import { requireSessionUser } from '@/lib/auth/session';
import { toAccessControlErrorResponse } from '@/lib/auth/response';
import { formatLocalDate, getTodayInLocalTime, parseAndValidateLocalDate } from '@/lib/localDate';
import * as fridgeService from '@/services/fridgeService';

interface RouteContext {
  params: Promise<{ item_id: string }>;
}

export async function PUT(req: Request, context: RouteContext) {
  try {
    const { userId } = await requireSessionUser();
    const { item_id: itemIdParam } = await context.params;
    if (!/^\d+$/.test(itemIdParam)) {
      return NextResponse.json(
        { success: false, message: '유효하지 않은 item_id입니다.' },
        { status: 400 },
      );
    }
    const itemId = Number(itemIdParam);

    if (itemId <= 0) {
      return NextResponse.json(
        { success: false, message: '유효하지 않은 item_id입니다.' },
        { status: 400 },
      );
    }

    const body = await req.json();
    const errors: string[] = [];

    if (body.quantity !== undefined && (typeof body.quantity !== 'number' || body.quantity <= 0)) {
      errors.push('수량(quantity)은 0보다 큰 숫자여야 합니다.');
    }
    if (body.expiry_date !== undefined) {
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

    if (errors.length > 0) {
      return NextResponse.json(
        { success: false, message: '잘못된 입력 데이터입니다.', errors },
        { status: 400 },
      );
    }

    const updated = await fridgeService.updateFridgeItem(userId, itemId, body);
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
    if (!/^\d+$/.test(itemIdParam)) {
      return NextResponse.json(
        { success: false, message: '유효하지 않은 item_id입니다.' },
        { status: 400 },
      );
    }
    const itemId = Number(itemIdParam);

    if (itemId <= 0) {
      return NextResponse.json(
        { success: false, message: '유효하지 않은 item_id입니다.' },
        { status: 400 },
      );
    }

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
