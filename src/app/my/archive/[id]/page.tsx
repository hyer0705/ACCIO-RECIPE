import Link from 'next/link';

export default function MyArchiveDetailPage({ params }: { params: { id: string } }) {
  return (
    <div className="max-w-[1000px]">
      <h1 className="text-[28px] font-bold text-[#3C2D23] mb-6">매콤 달콤 떡볶이</h1>

      {/* Alert / Lesson Note */}
      <div className="border border-[#FFBABA] bg-[#FFF4F4] rounded-[20px] p-6 mb-8">
        <div className="flex items-center gap-1.5 text-sm font-bold text-[#EF4444] mb-2">
          <span>⚠️</span> 지난번 루시님의 메모
        </div>
        <div className="text-[15px] text-[#3C2D23]">
          &quot;인덕션 6단은 소스가 쉽게 탑니다. 4단으로 줄여서 조리하세요.&quot;
        </div>
      </div>

      <div className="flex gap-6 h-[480px]">
        {/* Ingredients Block */}
        <div className="flex-1 bg-white rounded-[20px] p-8 shadow-sm">
          <h2 className="text-[18px] font-bold text-[#3C2D23] mb-6">재료 (2인분)</h2>
          <ul className="text-[15px] text-[#554A43] space-y-4">
            <li className="flex items-center before:content-['-'] before:mr-2">떡볶이 떡 400g</li>
            <li className="flex items-center before:content-['-'] before:mr-2">고추장 2.5스푼</li>
            {/* Add more items if needed to fill space */}
          </ul>
        </div>

        {/* Instructions Block */}
        <div className="flex-[2] bg-white rounded-[20px] p-8 shadow-sm flex flex-col relative">
          <h2 className="text-[18px] font-bold text-[#3C2D23] mb-6">조리 순서</h2>
          <ol className="text-[15px] text-[#554A43] space-y-5 flex-1">
            <li className="flex">
              <span className="mr-2">1.</span>
              <span>물 500ml에 육수 팩을 넣고 끓입니다.</span>
            </li>
            <li className="flex">
              <span className="mr-2">2.</span>
              <span>양념장을 배합합니다. (메모 참고: 타지 않게 주의)</span>
            </li>
          </ol>

          {/* Cooking Button */}
          <div className="absolute bottom-8 right-8">
            <Link
              href={`/cooking/${params.id}`}
              className="inline-flex items-center justify-center bg-[#FF5A28] text-white px-10 py-4 rounded-full font-bold text-[16px] hover:bg-[#E04D20] transition-colors shadow-md"
            >
              이 레시피로 다시 요리하기
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
