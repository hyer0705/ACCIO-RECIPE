import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import prisma from '@/lib/prisma';

/**
 * @swagger
 * /api/dashboard:
 *   get:
 *     summary: 홈 대시보드 요약 통계 조회
 *     description: |
 *       홈 대시보드 화면("반가워요, 루시님!")에서 필요한 모든 데이터를 단일 API로 제공합니다.
 *       - `monthly_cooking_count`: 이번 달(1일~오늘) 전체 요리 횟수
 *       - `prev_month_cooking_count`: 지난달 요리 횟수 (지난달 대비 증감 배지용)
 *       - `monthly_success_rate`: 이번 달 성공률 (%) — SUCCESS / 전체 * 100, 기록 없으면 null
 *       - `expiring_items`: 유통기한이 오늘부터 7일 이내인 냉장고 재료 목록 (D-Day 포함)
 *       - `latest_lesson`: 가장 최근 회고 노트가 있는 요리 기록 1건 (레시피 제목 포함)
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 대시보드 데이터 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     monthly_cooking_count:
 *                       type: integer
 *                       example: 12
 *                     prev_month_cooking_count:
 *                       type: integer
 *                       example: 9
 *                     monthly_success_rate:
 *                       type: number
 *                       nullable: true
 *                       example: 85
 *                     expiring_items:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           item_id:
 *                             type: integer
 *                           name:
 *                             type: string
 *                           expiry_date:
 *                             type: string
 *                             format: date
 *                           d_day:
 *                             type: integer
 *                             description: 음수이면 이미 만료됨
 *                     latest_lesson:
 *                       type: object
 *                       nullable: true
 *                       properties:
 *                         log_id:
 *                           type: integer
 *                         recipe_title:
 *                           type: string
 *                         lesson_note:
 *                           type: string
 *                         cooked_at:
 *                           type: string
 *                           format: date-time
 *       401:
 *         description: 인증 실패
 *       500:
 *         description: 서버 내부 오류
 */

export async function GET() {
  try {
    // ── 1. 인증 ──────────────────────────────────────────────────────
    const session = await getServerSession(authOptions);

    if (!session || !session.user || !('id' in session.user)) {
      return NextResponse.json({ success: false, message: '인증이 필요합니다.' }, { status: 401 });
    }

    const userId = parseInt(session.user.id as string, 10);

    // ── 2. 날짜 범위 계산 ─────────────────────────────────────────────
    const now = new Date();

    // 이번 달 1일 00:00:00
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    // 이번 달 오늘 23:59:59
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    // 지난달 범위
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59); // 이번달 1일 -1일

    // 유통기한 임박 기준: 오늘 00:00:00 ~ 오늘+7일 23:59:59
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const expiryThreshold = new Date(today);
    expiryThreshold.setDate(expiryThreshold.getDate() + 7);

    // ── 3. 병렬 쿼리 실행 ─────────────────────────────────────────────
    const [thisMonthLogs, prevMonthCount, expiringRaw, latestLesson] = await Promise.all([
      // 이번 달 전체 로그 (status 계산용)
      prisma.cooking_logs.findMany({
        where: {
          user_id: userId,
          cooked_at: { gte: thisMonthStart, lte: todayEnd },
        },
        select: { status: true },
      }),

      // 지난달 요리 횟수
      prisma.cooking_logs.count({
        where: {
          user_id: userId,
          cooked_at: { gte: prevMonthStart, lte: prevMonthEnd },
        },
      }),

      // 유통기한 임박 재료 (오늘 ~ +7일)
      prisma.fridge_items.findMany({
        where: {
          user_id: userId,
          expiry_date: { lte: expiryThreshold },
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

      // 가장 최근 회고 노트 (lesson_note가 있는 것만)
      prisma.cooking_logs.findFirst({
        where: {
          user_id: userId,
          lesson_note: { not: null },
        },
        select: {
          log_id: true,
          lesson_note: true,
          cooked_at: true,
          recipes: {
            select: { title: true },
          },
        },
        orderBy: { cooked_at: 'desc' },
      }),
    ]);

    // ── 4. 이번 달 성공률 계산 ────────────────────────────────────────
    const totalCount = thisMonthLogs.length;
    const successCount = thisMonthLogs.filter((log) => log.status === 'SUCCESS').length;
    const monthlySuccessRate =
      totalCount > 0 ? Math.round((successCount / totalCount) * 100) : null;

    // ── 5. 유통기한 임박 재료: D-Day 계산 ────────────────────────────
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
        expiry_date: expiryDate ? expiryDate.toISOString().split('T')[0] : null,
        d_day: dDay,
      };
    });

    // ── 6. 최근 회고 응답 가공 ────────────────────────────────────────
    const latestLessonData = latestLesson
      ? {
          log_id: latestLesson.log_id,
          recipe_title: latestLesson.recipes?.title ?? null,
          lesson_note: latestLesson.lesson_note,
          cooked_at: latestLesson.cooked_at,
        }
      : null;

    return NextResponse.json({
      success: true,
      data: {
        monthly_cooking_count: totalCount,
        prev_month_cooking_count: prevMonthCount,
        monthly_success_rate: monthlySuccessRate,
        expiring_items: expiringItems,
        latest_lesson: latestLessonData,
      },
    });
  } catch (error: unknown) {
    console.error('GET /api/dashboard Error:', error);
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
