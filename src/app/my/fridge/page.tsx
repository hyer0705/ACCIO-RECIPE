import Link from 'next/link';

export default function MyFridgePage() {
  return (
    <div className="max-w-[1000px] flex flex-col h-full">
      <h1 className="text-[28px] font-bold text-[#3C2D23] mb-8">우리 집 식재료 창고</h1>

      {/* Table Header */}
      <div className="flex px-8 mb-4">
        <div className="flex-1 text-[13px] text-[#A59A94] font-medium">식재료 명</div>
        <div className="w-[120px] text-[13px] text-[#A59A94] font-medium">수량</div>
        <div className="flex-1 text-[13px] text-[#A59A94] font-medium">유통기한</div>
      </div>

      {/* Item List */}
      <div className="flex flex-col gap-4 mb-12">
        {/* Item 1 */}
        <div className="bg-white rounded-[20px] px-8 py-5 flex items-center shadow-sm">
          <div className="flex-1 text-[16px] font-bold text-[#3C2D23] flex items-center gap-2">
            <span>🥚</span> 달걀
          </div>
          <div className="w-[120px] text-[15px] font-medium text-[#3C2D23]">2 개</div>
          <div className="flex-1 flex justify-between items-center text-[15px]">
            <span className="text-[#EF4444] font-medium">2026. 03. 01 (임박)</span>
            <button className="bg-[#F8F9FA] text-[#8C847E] text-[13px] px-4 py-1.5 rounded-lg border border-[#E9ECEF] hover:bg-[#E9ECEF] transition-colors font-medium">
              수정
            </button>
          </div>
        </div>

        {/* Item 2 */}
        <div className="bg-white rounded-[20px] px-8 py-5 flex items-center shadow-sm">
          <div className="flex-1 text-[16px] font-bold text-[#3C2D23] flex items-center gap-2">
            <span>🧅</span> 양파
          </div>
          <div className="w-[120px] text-[15px] font-medium text-[#3C2D23]">5 개</div>
          <div className="flex-1 flex justify-between items-center text-[15px]">
            <span className="text-[#3C2D23] font-medium">2026. 03. 15</span>
            <button className="bg-[#F8F9FA] text-[#8C847E] text-[13px] px-4 py-1.5 rounded-lg border border-[#E9ECEF] hover:bg-[#E9ECEF] transition-colors font-medium">
              수정
            </button>
          </div>
        </div>
      </div>

      {/* Add Button */}
      <div className="mt-auto pb-12">
        <Link
          href="/my/fridge/add"
          className="flex justify-center items-center bg-[#FF5A28] text-white py-5 rounded-[20px] font-bold text-[16px] hover:bg-[#E04D20] transition-colors w-full shadow-md"
        >
          + 새 재료 추가하기
        </Link>
      </div>
    </div>
  );
}
