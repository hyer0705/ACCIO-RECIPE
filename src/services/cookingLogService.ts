import prisma from '@/lib/prisma';
import { assertCookingLogOwner } from '@/lib/auth/authorization';
import { notFound } from '@/lib/auth/errors';
import { cooking_logs_status } from '@/generated/client/enums';

export interface CreateCookingLogData {
  status: cooking_logs_status;
  recipe_id: number;
  lesson_note: string;
  companion?: string;
}

export type UpdateCookingLogData = Omit<Partial<CreateCookingLogData>, 'recipe_id'>;

/**
 * 사용자의 전체 요리 기록 목록을 최신순으로 조회
 */
export async function getCookingLogs(userId: number) {
  const logs = await prisma.cooking_logs.findMany({
    where: {
      user_id: userId,
      recipes: {
        user_id: userId,
        status: 'COMPLETED',
      },
    },
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

  return logs.map((log) => ({
    log_id: log.log_id,
    recipe_id: log.recipe_id,
    recipe_title: log.recipes?.title ?? null,
    status: log.status,
    lesson_note: log.lesson_note,
    companion: log.companion,
    cooked_at: log.cooked_at,
  }));
}

/**
 * 새로운 요리 기록 작성
 */
export async function createCookingLog(userId: number, data: CreateCookingLogData) {
  // 1. 유효성 검사
  if (!data.lesson_note || data.lesson_note.trim().length === 0) {
    throw new Error('lesson_note는 필수입니다.');
  }

  // 2. 레시피 존재 여부 확인
  const existingRecipe = await prisma.recipes.findUnique({
    where: {
      recipe_id: data.recipe_id,
      user_id: userId,
      status: 'COMPLETED',
    },
    select: { recipe_id: true },
  });

  if (!existingRecipe) {
    throw new Error('존재하지 않는 레시피입니다.');
  }

  // 3. 기록 저장
  return await prisma.cooking_logs.create({
    data: {
      user_id: userId,
      recipe_id: data.recipe_id,
      status: data.status,
      lesson_note: data.lesson_note.trim(),
      companion: data.companion?.trim() ?? null,
    },
  });
}

/**
 * 요리 기록 상세 조회
 */
export async function getCookingLogDetail(logId: number, userId: number) {
  await assertCookingLogOwner(userId, logId, {
    forbiddenMessage: '조회 권한이 없습니다.',
  });

  const log = await prisma.cooking_logs.findUnique({
    where: { log_id: logId },
    include: {
      recipes: {
        select: { title: true },
      },
    },
  });

  if (!log) {
    throw notFound('존재하지 않는 요리 기록입니다.');
  }

  return {
    ...log,
    recipe_title: log.recipes?.title ?? null,
  };
}

/**
 * 요리 기록 수정
 */
export async function updateCookingLog(logId: number, userId: number, data: UpdateCookingLogData) {
  await assertCookingLogOwner(userId, logId, {
    forbiddenMessage: '수정 권한이 없습니다.',
  });

  const updateData: Record<string, unknown> = {};
  if (data.status !== undefined) updateData.status = data.status;
  if (data.lesson_note !== undefined) updateData.lesson_note = data.lesson_note.trim();
  if (data.companion !== undefined) updateData.companion = data.companion.trim() || null;

  return await prisma.cooking_logs.update({
    where: { log_id: logId },
    data: updateData,
  });
}

/**
 * 요리 기록 삭제
 */
export async function deleteCookingLog(logId: number, userId: number) {
  await assertCookingLogOwner(userId, logId, {
    forbiddenMessage: '삭제 권한이 없습니다.',
  });

  return await prisma.cooking_logs.delete({
    where: { log_id: logId },
  });
}
