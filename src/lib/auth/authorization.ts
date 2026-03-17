import prisma from '@/lib/prisma';
import { forbidden, notFound } from './errors';

interface OwnershipMessages {
  notFoundMessage: string;
  forbiddenMessage: string;
}

async function assertOwnership(
  ownerUserId: number | null | undefined,
  currentUserId: number,
  messages: OwnershipMessages,
) {
  if (ownerUserId == null) {
    throw notFound(messages.notFoundMessage);
  }

  if (ownerUserId !== currentUserId) {
    throw forbidden(messages.forbiddenMessage);
  }
}

export async function assertRecipeOwner(
  userId: number,
  recipeId: number,
  messages: Partial<OwnershipMessages> = {},
) {
  const recipe = await prisma.recipes.findUnique({
    where: { recipe_id: recipeId },
    select: { user_id: true },
  });

  await assertOwnership(recipe?.user_id, userId, {
    notFoundMessage: '존재하지 않는 레시피입니다.',
    forbiddenMessage: '접근 권한이 없습니다.',
    ...messages,
  });
}

export async function assertFridgeItemOwner(
  userId: number,
  itemId: number,
  messages: Partial<OwnershipMessages> = {},
) {
  const item = await prisma.fridge_items.findUnique({
    where: { item_id: itemId },
    select: { user_id: true },
  });

  await assertOwnership(item?.user_id, userId, {
    notFoundMessage: '존재하지 않는 재료입니다.',
    forbiddenMessage: '접근 권한이 없습니다.',
    ...messages,
  });
}

export async function assertCookingLogOwner(
  userId: number,
  logId: number,
  messages: Partial<OwnershipMessages> = {},
) {
  const log = await prisma.cooking_logs.findUnique({
    where: { log_id: logId },
    select: { user_id: true },
  });

  await assertOwnership(log?.user_id, userId, {
    notFoundMessage: '존재하지 않는 요리 기록입니다.',
    forbiddenMessage: '접근 권한이 없습니다.',
    ...messages,
  });
}
