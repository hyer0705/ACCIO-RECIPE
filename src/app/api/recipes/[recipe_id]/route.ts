import { NextResponse } from 'next/server';
import { requireSessionUser } from '@/lib/auth/session';
import { toAccessControlErrorResponse } from '@/lib/auth/response';
import * as recipeService from '@/services/recipeService';

interface RouteContext {
  params: Promise<{ recipe_id: string }>;
}

export async function GET(req: Request, context: RouteContext) {
  try {
    const { userId } = await requireSessionUser();
    const { recipe_id: recipeIdParam } = await context.params;
    const recipeId = parseInt(recipeIdParam, 10);

    if (isNaN(recipeId) || recipeId <= 0) {
      return NextResponse.json(
        { success: false, message: '유효하지 않은 recipe_id입니다.' },
        { status: 400 },
      );
    }

    const { searchParams } = new URL(req.url);
    const requestedServings = parseInt(searchParams.get('servings') ?? '0', 10);

    const recipe = await recipeService.getRecipeDetail(recipeId, userId, requestedServings);

    if (!recipe) {
      return NextResponse.json(
        { success: false, message: '존재하지 않는 레시피입니다.' },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: recipe,
    });
  } catch (error: unknown) {
    const accessErrorResponse = toAccessControlErrorResponse(error);
    if (accessErrorResponse) {
      return accessErrorResponse;
    }

    console.error('GET /api/recipes/[recipe_id] Error:', error);
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
    const { recipe_id: recipeIdParam } = await context.params;
    const recipeId = parseInt(recipeIdParam, 10);

    if (isNaN(recipeId) || recipeId <= 0) {
      return NextResponse.json(
        { success: false, message: '유효하지 않은 recipe_id입니다.' },
        { status: 400 },
      );
    }

    await recipeService.deleteRecipe(recipeId, userId);
    return NextResponse.json(
      { success: true, message: '레시피가 삭제되었습니다.' },
      { status: 200 },
    );
  } catch (error: unknown) {
    const accessErrorResponse = toAccessControlErrorResponse(error);
    if (accessErrorResponse) {
      return accessErrorResponse;
    }

    console.error('DELETE /api/recipes/[recipe_id] Error:', error);
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
