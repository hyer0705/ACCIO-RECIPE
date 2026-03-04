'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';

interface CookingLog {
  log_id: number;
  recipe_id: number;
  recipe_title: string | null;
  status: 'SUCCESS' | 'REGRET' | 'FAIL';
  lesson_note: string | null;
  companion: string | null;
  cooked_at: string;
}

export default function MyArchivePage() {
  const {
    data: logs,
    isLoading,
    isError,
  } = useQuery<CookingLog[]>({
    queryKey: ['cooking-logs'],
    queryFn: async () => {
      const res = await fetch('/api/cooking-logs');
      if (!res.ok) throw new Error('Failed to fetch cooking logs');
      const json = await res.json();
      return json.data;
    },
  });

  if (isLoading) {
    return <div className="flex justify-center items-center h-64 text-[#A59A94]">로딩 중...</div>;
  }

  if (isError || !logs) {
    return (
      <div className="flex justify-center items-center h-64 text-[#EF4444]">
        데이터를 불러오는데 실패했습니다.
      </div>
    );
  }

  // 상단 통계 계산
  const totalCooks = logs.length;
  const successCooks = logs.filter((log) => log.status === 'SUCCESS').length;
  const avgSuccessRate = totalCooks > 0 ? Math.round((successCooks / totalCooks) * 100) : 0;

  return (
    <div className="max-w-5xl">
      <h1 className="text-2xl font-bold text-[#3C2D23] mb-8">루시님의 요리 성장 서재</h1>

      {/* Stats Card */}
      <div className="bg-white rounded-[20px] p-8 mb-10 shadow-sm flex items-center gap-16">
        <div>
          <div className="text-sm text-gray-400 mb-1">누적 조리</div>
          <div className="text-[28px] font-bold text-[#3C2D23]">{totalCooks}회</div>
        </div>
        <div>
          <div className="text-sm text-gray-400 mb-1">평균 성공률</div>
          <div className="text-[28px] font-bold text-[#4CAF50]">{avgSuccessRate}%</div>
        </div>
      </div>

      <h2 className="text-lg font-bold text-[#3C2D23] mb-4">최근 저장된 레시피</h2>

      {/* Recipe List */}
      <div className="flex flex-col gap-4">
        {logs.length === 0 ? (
          <div className="text-center text-[#A59A94] py-10">아직 저장된 요리 기록이 없습니다.</div>
        ) : (
          logs.map((log) => {
            // Status-based styles
            const isSuccess = log.status === 'SUCCESS';
            const isRegret = log.status === 'REGRET';
            const isFail = log.status === 'FAIL';

            let borderColor = 'bg-[#4CAF50]'; // Default Success
            if (isRegret) borderColor = 'bg-[#F59E0B]';
            if (isFail) borderColor = 'bg-[#EF4444]';

            let labelEmoji = '🤩';
            let labelText = '성공적으로 마스터함';
            let alertBg = 'bg-[#F0FDF4]';
            let alertTextCol = 'text-[#4CAF50]';

            if (isRegret) {
              labelEmoji = '🤔';
              labelText = '지난번 아쉬움 기록 (배울 점)';
              alertBg = 'bg-[#FFFBE6]';
              alertTextCol = 'text-[#F59E0B]';
            } else if (isFail) {
              labelEmoji = '⚠️';
              labelText = '지난번 실패 기록 (배울 점)';
              alertBg = 'bg-[#FFF4F4]';
              alertTextCol = 'text-[#EF4444]';
            }

            return (
              <div
                key={log.log_id}
                className="bg-white rounded-[20px] flex items-stretch overflow-hidden shadow-sm min-h-40 max-w-5xl"
              >
                {/* Left colored border */}
                <div className={`w-4 ${borderColor} shrink-0`}></div>

                <div className="flex-1 flex items-center p-6 gap-[30px]">
                  <div className="flex-1 shrink-0">
                    <Link
                      href={`/my/archive/${log.recipe_id}`}
                      className="hover:opacity-80 transition-opacity block"
                    >
                      <h3 className="text-[18px] font-bold text-[#3C2D23]">
                        {log.recipe_title || '연결된 레시피 없음'}
                      </h3>
                      <div className="text-[13px] text-gray-400 mt-1">
                        {new Date(log.cooked_at).toLocaleDateString()}
                      </div>
                    </Link>
                  </div>

                  <div className="w-[450px] shrink-0">
                    {log.lesson_note ? (
                      <Link href={`/my/archive/${log.recipe_id}`} className="block">
                        <div
                          className={`${alertBg} rounded-xl p-4 inline-block w-full hover:opacity-80 transition-opacity`}
                        >
                          <div
                            className={`flex items-center gap-1 text-[13px] font-bold ${alertTextCol} mb-2`}
                          >
                            <span>{labelEmoji}</span> {labelText}
                          </div>
                          <div className="text-[14px] text-[#3C2D23] line-clamp-2">
                            &quot;{log.lesson_note}&quot;
                          </div>
                        </div>
                      </Link>
                    ) : (
                      isSuccess && (
                        <Link href={`/my/archive/${log.recipe_id}`} className="block w-full h-full">
                          <div className="w-full h-full flex items-center justify-center hover:opacity-80 transition-opacity">
                            <div className={`text-[15px] font-bold ${alertTextCol}`}>
                              {labelEmoji} {labelText}
                            </div>
                          </div>
                        </Link>
                      )
                    )}
                  </div>

                  <div className="w-[220px] shrink-0 flex justify-end">
                    {log.recipe_id && (
                      <Link
                        href={`/recipes/${log.recipe_id}/cook`}
                        className="inline-flex items-center justify-center w-full bg-[#FF5A28] text-white py-3.5 rounded-full font-bold text-[15px] hover:bg-[#E04D20] transition-colors"
                      >
                        다시 조리하기
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
