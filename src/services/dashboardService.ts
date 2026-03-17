import prisma from '@/lib/prisma';

/**
 * 대시보드 요약 데이터 인터페이스
 */
export interface DashboardSummary {
  monthly_cooking_count: number;
  prev_month_cooking_count: number;
  monthly_success_rate: number | null;
  expiring_items: Array<{
    item_id: number;
    name: string;
    icon_url: string | null;
    expiry_date: string | null;
    d_day: number | null;
  }>;
  latest_lesson: {
    log_id: number;
    recipe_title: string | null;
    lesson_note: string | null;
    cooked_at: Date | null;
  } | null;
  recent_recipes: Array<{
    recipe_id: number;
    title: string;
    thumbnail_url: string | null;
    difficulty: string | null;
    servings: number | null;
    created_at: Date;
  }>;
}

/**
 * 사용자별 대시보드 요약 정보 조회
 */
export async function getDashboardSummary(userId: number): Promise<DashboardSummary> {
  const now = new Date();

  // 이번 달 1일 00:00:00
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const tomorrowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

  // 지난달 범위
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  // 유통기한 임박 기준: 오늘 ~ 오늘+7일 전체 포함
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const expiryThresholdNextDay = new Date(today);
  expiryThresholdNextDay.setDate(expiryThresholdNextDay.getDate() + 8);

  const [thisMonthLogs, prevMonthCount, expiringRaw, latestLesson, recentRecipes] =
    await Promise.all([
      prisma.cooking_logs.findMany({
        where: {
          user_id: userId,
          cooked_at: { gte: thisMonthStart, lt: tomorrowStart },
        },
        select: { status: true },
      }),
      prisma.cooking_logs.count({
        where: {
          user_id: userId,
          cooked_at: { gte: prevMonthStart, lt: currentMonthStart },
        },
      }),
      prisma.fridge_items.findMany({
        where: {
          user_id: userId,
          expiry_date: { gte: startOfToday, lt: expiryThresholdNextDay },
        },
        select: {
          item_id: true,
          custom_name: true,
          expiry_date: true,
          ingredients_master: {
            select: { name: true, icon_url: true },
          },
        },
        orderBy: { expiry_date: 'asc' },
      }),
      prisma.cooking_logs.findFirst({
        where: {
          user_id: userId,
          lesson_note: { not: null },
          recipes: {
            is: {
              user_id: userId,
              status: 'COMPLETED',
            },
          },
        },
        select: {
          log_id: true,
          lesson_note: true,
          cooked_at: true,
          recipes: { select: { title: true } },
        },
        orderBy: { cooked_at: 'desc' },
      }),
      prisma.recipes.findMany({
        where: { user_id: userId, status: 'COMPLETED' },
        select: {
          recipe_id: true,
          title: true,
          thumbnail_url: true,
          difficulty: true,
          servings: true,
          created_at: true,
        },
        orderBy: { created_at: 'desc' },
        take: 3,
      }),
    ]);

  // 성공률 계산
  const totalCount = thisMonthLogs.length;
  const successCount = thisMonthLogs.filter((log) => log.status === 'SUCCESS').length;
  const monthlySuccessRate = totalCount > 0 ? Math.round((successCount / totalCount) * 100) : null;

  // 유통기한 데이터 가공
  const expiringItems = expiringRaw.map((item) => {
    const name = item.ingredients_master?.name ?? item.custom_name ?? '알 수 없는 재료';
    const iconUrl = item.ingredients_master?.icon_url ?? null;
    const expiryDate = item.expiry_date;

    let dDay: number | null = null;
    if (expiryDate) {
      const expiry = new Date(expiryDate);
      expiry.setHours(0, 0, 0, 0);
      const diffMs = expiry.getTime() - today.getTime();
      dDay = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    }

    return {
      item_id: item.item_id,
      name,
      icon_url: iconUrl,
      expiry_date: expiryDate
        ? `${expiryDate.getFullYear()}-${String(expiryDate.getMonth() + 1).padStart(2, '0')}-${String(expiryDate.getDate()).padStart(2, '0')}`
        : null,
      d_day: dDay,
    };
  });

  return {
    monthly_cooking_count: totalCount,
    prev_month_cooking_count: prevMonthCount,
    monthly_success_rate: monthlySuccessRate,
    expiring_items: expiringItems,
    latest_lesson: latestLesson
      ? {
          log_id: latestLesson.log_id,
          recipe_title: latestLesson.recipes?.title ?? null,
          lesson_note: latestLesson.lesson_note,
          cooked_at: latestLesson.cooked_at,
        }
      : null,
    recent_recipes: recentRecipes.map((r) => ({
      ...r,
      difficulty: r.difficulty as string | null,
      created_at: r.created_at as Date,
    })),
  };
}
