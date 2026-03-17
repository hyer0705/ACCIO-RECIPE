import { NextResponse } from 'next/server';
import { requireSessionUser } from '@/lib/auth/session';
import { toAccessControlErrorResponse } from '@/lib/auth/response';
import * as dashboardService from '@/services/dashboardService';

/**
 * @swagger
 * /api/dashboard:
 *   get:
 *     summary: 홈 대시보드 요약 통계 조회
 */
export async function GET() {
  try {
    const { userId } = await requireSessionUser();
    const dashboardData = await dashboardService.getDashboardSummary(userId);

    return NextResponse.json({
      success: true,
      data: dashboardData,
    });
  } catch (error: unknown) {
    const accessErrorResponse = toAccessControlErrorResponse(error);
    if (accessErrorResponse) {
      return accessErrorResponse;
    }

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
