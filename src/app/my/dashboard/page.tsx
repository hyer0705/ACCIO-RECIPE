export default function MyDashboardPage() {
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
            {/* Item 1 */}
            <div className="flex justify-between items-center bg-[#FFF4F4] px-6 py-4 rounded-xl">
              <span className="text-[15px] font-bold text-[#EF4444]">🥚 달걀</span>
              <span className="text-[14px] font-medium text-[#EF4444]">2026. 03. 01 (D-3)</span>
            </div>
            {/* Item 2 */}
            <div className="flex justify-between items-center bg-[#FFFBE6] px-6 py-4 rounded-xl">
              <span className="text-[15px] font-bold text-[#F59E0B]">🥛 우유</span>
              <span className="text-[14px] font-medium text-[#F59E0B]">2026. 03. 05 (D-7)</span>
            </div>
          </div>
        </div>

        {/* 이번 달 요리 */}
        <div className="bg-[#3C2D23] rounded-[20px] p-8 shadow-sm flex flex-col justify-between">
          <h2 className="text-[16px] font-bold text-white mb-4">이번 달 요리</h2>
          <div>
            <div className="text-[48px] font-bold text-[#FFB233] leading-none mb-1">
              12 <span className="text-[20px] text-white font-medium">회</span>
            </div>
            <div className="text-[13px] text-[#A59A94]">지난달 대비 +3회</div>
          </div>
        </div>

        {/* 성공률 */}
        <div className="bg-[#FF5A28] rounded-[20px] p-8 shadow-sm flex flex-col justify-between">
          <h2 className="text-[16px] font-bold text-white mb-4">성공률</h2>
          <div>
            <div className="text-[48px] font-bold text-white leading-none">
              85 <span className="text-[24px]">%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Lesson Note */}
      <div className="border border-[#FF5A28] bg-white rounded-[20px] p-8 mb-8 relative">
        <h2 className="text-[15px] font-bold text-[#FF5A28] mb-4">💡 잊지 마세요! 지난번의 배움</h2>
        <div className="text-[13px] text-[#A59A94] mb-2">매콤 달콤 떡볶이</div>
        <p className="text-[18px] font-bold text-[#3C2D23]">
          &quot;인덕션 6단은 소스가 쉽게 탑니다. 4단으로 줄여서 조리하세요.&quot;
        </p>
      </div>

      {/* Bottom Buttons */}
      <div className="flex gap-6">
        <button className="flex-1 bg-[#3C2D23] text-white py-5 rounded-[20px] font-bold text-[16px] hover:bg-[#2C211A] transition-colors">
          새 레시피 분석하기
        </button>
        <button className="flex-1 bg-white border border-[#3C2D23] text-[#3C2D23] py-5 rounded-[20px] font-bold text-[16px] hover:bg-gray-50 transition-colors">
          냉장고 비우러 가기
        </button>
      </div>
    </div>
  );
}
