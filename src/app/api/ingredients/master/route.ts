import { NextResponse } from 'next/server';
import { toAccessControlErrorResponse } from '@/lib/auth/response';
import { requireSessionUser } from '@/lib/auth/session';
import * as ingredientService from '@/services/ingredientService';

export async function GET(req: Request) {
  try {
    await requireSessionUser();

    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q') ?? '';

    const data = await ingredientService.searchMasterIngredients(q);

    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    const accessErrorResponse = toAccessControlErrorResponse(error);
    if (accessErrorResponse) {
      return accessErrorResponse;
    }

    console.error('GET /api/ingredients/master Error:', error);
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
