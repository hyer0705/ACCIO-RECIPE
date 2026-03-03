'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';

// Data Interface based on API response
interface ExpiringItem {
  item_id: number;
  name: string;
  icon_url: string | null;
  expiry_date: string; // YYYY-MM-DD
  d_day: number;
}

interface LatestLesson {
  log_id: number;
  recipe_title: string;
  lesson_note: string;
  cooked_at: string;
}

interface DashboardData {
  monthly_cooking_count: number;
  prev_month_cooking_count: number;
  monthly_success_rate: number | null;
  expiring_items: ExpiringItem[];
  latest_lesson: LatestLesson | null;
}

export default function MyDashboardPage() {
  const { data, isLoading, isError } = useQuery<DashboardData>({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const res = await fetch('/api/dashboard');
      if (!res.ok) throw new Error('Failed to fetch dashboard data');
      const json = await res.json();
      return json.data;
    },
  });

  if (isLoading) {
    return (
      <div className="max-w-[1000px] flex justify-center items-center h-64 text-[#A59A94]">
        로딩 중...
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="max-w-[1000px] flex justify-center items-center h-64 text-[#EF4444]">
        데이터를 불러오는데 실패했습니다.
      </div>
    );
  }

  // 월간 횟수 증감 계산
  const diffCount = data.monthly_cooking_count - data.prev_month_cooking_count;
  const diffText = diffCount >= 0 ? `+${diffCount}회` : `${diffCount}회`;

  return (
    <div className="max-w-[1000px]">
      <h1 className="text-[28px] font-bold text-[#3C2D23] mb-8">
        반가워요, 루시님! 오늘의 주방은 어떤가요?
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-6">
        {/* 빨리 사용해야 할 재료 */}
        <div className="bg-white rounded-[20px] p-8 shadow-sm lg:col-span-2">
          <h2 className="text-[16px] font-bold text-[#3C2D23] mb-6">빨리 사용해야 할 재료</h2>
          <div className="flex flex-col gap-4">
            {data.expiring_items.length === 0 ? (
              <div className="text-[14px] text-[#A59A94] text-center py-4">
                유통기한이 임박한 식재료가 없습니다. 😊
              </div>
            ) : (
              data.expiring_items.map((item) => {
                const isUrgent = item.d_day <= 3;
                return (
                  <div
                    key={item.item_id}
                    className={`flex justify-between items-center px-6 py-4 rounded-xl ${
                      isUrgent ? 'bg-[#FFF4F4]' : 'bg-[#FFFBE6]'
                    }`}
                  >
                    <span
                      className={`text-[15px] font-bold ${
                        isUrgent ? 'text-[#EF4444]' : 'text-[#F59E0B]'
                      }`}
                    >
                      {item.icon_url ? '🥗' : '🥕'} {item.name}
                    </span>
                    <span
                      className={`text-[14px] font-medium ${
                        isUrgent ? 'text-[#EF4444]' : 'text-[#F59E0B]'
                      }`}
                    >
                      {item.expiry_date.replaceAll('-', '. ')} (D
                      {item.d_day <= 0
                        ? item.d_day === 0
                          ? '-Day'
                          : `+${Math.abs(item.d_day)}`
                        : `-${item.d_day}`}
                      )
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* 이번 달 요리 */}
        <div className="bg-[#3C2D23] rounded-[20px] p-8 shadow-sm flex flex-col justify-between">
          <h2 className="text-[16px] font-bold text-white mb-4">이번 달 요리</h2>
          <div>
            <div className="text-[48px] font-bold text-[#FFB233] leading-none mb-1">
              {data.monthly_cooking_count}{' '}
              <span className="text-[20px] text-white font-medium">회</span>
            </div>
            <div className="text-[13px] text-[#A59A94]">지난달 대비 {diffText}</div>
          </div>
        </div>

        {/* 성공률 */}
        <div className="bg-[#FF5A28] rounded-[20px] p-8 shadow-sm flex flex-col justify-between">
          <h2 className="text-[16px] font-bold text-white mb-4">성공률</h2>
          <div>
            {data.monthly_success_rate !== null ? (
              <div className="text-[48px] font-bold text-white leading-none">
                {data.monthly_success_rate} <span className="text-[24px]">%</span>
              </div>
            ) : (
              <div className="text-[20px] font-bold text-white leading-none mt-4">기록 없음</div>
            )}
          </div>
        </div>
      </div>

      {/* Lesson Note */}
      {data.latest_lesson && (
        <div className="border border-[#FF5A28] bg-white rounded-[20px] p-8 mb-8 relative">
          <h2 className="text-[15px] font-bold text-[#FF5A28] mb-4">
            💡 잊지 마세요! 지난번의 배움
          </h2>
          <div className="text-[13px] text-[#A59A94] mb-2">
            {data.latest_lesson.recipe_title || '나의 요리 저장소'}
          </div>
          <p className="text-[18px] font-bold text-[#3C2D23]">
            &quot;{data.latest_lesson.lesson_note}&quot;
          </p>
        </div>
      )}

      {/* Bottom Buttons */}
      <div className="flex gap-6">
        <Link
          href="/"
          className="flex-1 flex items-center justify-center bg-[#3C2D23] text-white py-5 rounded-[20px] font-bold text-[16px] hover:bg-[#2C211A] transition-colors"
        >
          새 레시피 분석하기
        </Link>
        <Link
          href="/my/fridge"
          className="flex-1 flex items-center justify-center bg-white border border-[#3C2D23] text-[#3C2D23] py-5 rounded-[20px] font-bold text-[16px] hover:bg-gray-50 transition-colors"
        >
          냉장고 비우러 가기
        </Link>
      </div>
    </div>
  );
}
