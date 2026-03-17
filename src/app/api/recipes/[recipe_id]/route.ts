import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import * as recipeService from '@/services/recipeService';

interface RouteContext {
  params: Promise<{ recipe_id: string }>;
}

export async function GET(req: Request, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !('id' in session.user)) {
      return NextResponse.json({ success: false, message: '인증이 필요합니다.' }, { status: 401 });
    }

    const userId = parseInt(session.user.id as string, 10);
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
    console.error('GET /api/recipes/[recipe_id] Error:', error);
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
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !('id' in session.user)) {
      return NextResponse.json({ success: false, message: '인증이 필요합니다.' }, { status: 401 });
    }

    const userId = parseInt(session.user.id as string, 10);
    const { recipe_id: recipeIdParam } = await context.params;
    const recipeId = parseInt(recipeIdParam, 10);

    if (isNaN(recipeId) || recipeId <= 0) {
      return NextResponse.json(
        { success: false, message: '유효하지 않은 recipe_id입니다.' },
        { status: 400 },
      );
    }

    try {
      await recipeService.deleteRecipe(recipeId, userId);
      return NextResponse.json(
        { success: true, message: '레시피가 삭제되었습니다.' },
        { status: 200 },
      );
    } catch (e: unknown) {
      const error = e as Error;
      if (error.message === 'NOT_FOUND') {
        return NextResponse.json(
          { success: false, message: '존재하지 않는 레시피입니다.' },
          { status: 404 },
        );
      }
      if (error.message === 'FORBIDDEN') {
        return NextResponse.json(
          { success: false, message: '삭제 권한이 없습니다.' },
          { status: 403 },
        );
      }
      throw error;
    }
  } catch (error: unknown) {
    console.error('DELETE /api/recipes/[recipe_id] Error:', error);
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
