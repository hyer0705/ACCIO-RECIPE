import Link from 'next/link';

export default function MyArchivePage() {
  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold text-[#3C2D23] mb-8">루시님의 요리 성장 서재</h1>

      {/* Stats Card */}
      <div className="bg-white rounded-[20px] p-8 mb-10 shadow-sm flex items-center gap-16">
        <div>
          <div className="text-sm text-gray-400 mb-1">누적 조리</div>
          <div className="text-[28px] font-bold text-[#3C2D23]">24회</div>
        </div>
        <div>
          <div className="text-sm text-gray-400 mb-1">평균 성공률</div>
          <div className="text-[28px] font-bold text-[#4CAF50]">85%</div>
        </div>
      </div>

      <h2 className="text-lg font-bold text-[#3C2D23] mb-4">최근 저장된 레시피</h2>

      {/* Recipe List */}
      <div className="flex flex-col gap-4">
        {/* Card 1 - Failure */}
        <div className="bg-white rounded-[20px] flex items-stretch overflow-hidden shadow-sm min-h-[120px]">
          {/* Left colored border */}
          <div className="w-4 bg-[#EF4444] shrink-0"></div>

          <div className="flex-1 flex items-center p-6 gap-6">
            <div className="w-1/4 shrink-0">
              <h3 className="text-[18px] font-bold text-[#3C2D23]">매콤 달콤 떡볶이</h3>
            </div>

            <div className="flex-1">
              <div className="bg-[#FFF4F4] rounded-xl p-4 inline-block w-full">
                <div className="flex items-center gap-1 text-xs font-bold text-[#EF4444] mb-2">
                  <span>⚠️</span> 지난번 실패 기록 (배울 점)
                </div>
                <div className="text-sm text-[#3C2D23]">
                  &quot;인덕션 6단은 소스가 쉽게 탑니다. 4단으로 줄여서 조리하세요.&quot;
                </div>
              </div>
            </div>

            <div className="shrink-0 pl-4">
              <Link
                href="/my/archive/1"
                className="inline-flex items-center justify-center bg-[#FF5A28] text-white px-8 py-3.5 rounded-full font-bold text-[15px] hover:bg-[#E04D20] transition-colors"
              >
                다시 조리하기
              </Link>
            </div>
          </div>
        </div>

        {/* Card 2 - Success */}
        <div className="bg-white rounded-[20px] flex items-stretch overflow-hidden shadow-sm min-h-[120px]">
          {/* Left green border */}
          <div className="w-4 bg-[#4CAF50] shrink-0"></div>

          <div className="flex-1 flex items-center p-6 gap-6">
            <div className="w-1/4 shrink-0">
              <h3 className="text-[18px] font-bold text-[#3C2D23]">진한 크림 파스타</h3>
            </div>

            <div className="flex-1 flex items-center justify-center">
              <div className="text-[15px] font-bold text-[#4CAF50]">🤩 성공적으로 마스터함</div>
            </div>

            <div className="shrink-0 pl-4 w-[160px]">
              {/* Box to keep layout balanced matching the button width */}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
