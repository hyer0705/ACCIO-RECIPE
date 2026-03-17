import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import * as dashboardService from '@/services/dashboardService';

/**
 * @swagger
 * /api/dashboard:
 *   get:
 *     summary: 홈 대시보드 요약 통계 조회
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || !('id' in session.user)) {
      return NextResponse.json({ success: false, message: '인증이 필요합니다.' }, { status: 401 });
    }

    const userId = parseInt(session.user.id as string, 10);
    const dashboardData = await dashboardService.getDashboardSummary(userId);

    return NextResponse.json({
      success: true,
      data: dashboardData,
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
