import Link from 'next/link';

export type TabType = 'overview' | 'growth_log';

interface TabMenuProps {
  recipeId: number;
  activeTab: TabType;
  cookCount: number;
  onTabChange: (tab: TabType) => void;
  currentServings: number;
}

export default function TabMenu({
  recipeId,
  activeTab,
  cookCount,
  onTabChange,
  currentServings,
}: TabMenuProps) {
  return (
    <div className="flex items-center justify-between mb-8 w-full">
      {/* Tabs Container - Exact 560x60 */}
      <div className="flex bg-[#EAE7E4] rounded-full w-[560px] h-[60px] p-[4px] items-center shrink-0 justify-between">
        <button
          onClick={() => onTabChange('overview')}
          className={`w-[272px] h-full rounded-full text-[15px] font-bold transition-all flex items-center justify-center ${
            activeTab === 'overview'
              ? 'bg-white text-[#3C2D23] shadow-sm'
              : 'text-[#8C827A] hover:bg-black/5'
          }`}
        >
          👀 한눈에 보기
        </button>
        <button
          onClick={() => onTabChange('growth_log')}
          className={`w-[272px] h-full rounded-full text-[15px] font-bold transition-all flex items-center justify-center ${
            activeTab === 'growth_log'
              ? 'bg-white text-[#3C2D23] shadow-sm'
              : 'text-[#8C827A] hover:bg-black/5'
          }`}
        >
          📈 요리 성장 일지 ({cookCount}회)
        </button>
      </div>

      {/* Button placed opposite to tabs */}
      <Link
        href={`/recipes/preview/${recipeId}?servings=${currentServings}`}
        className="inline-flex items-center justify-center bg-[#FF5A28] text-white px-8 h-[60px] rounded-full font-bold text-[16px] hover:bg-[#E04D20] transition-colors shadow-sm shrink-0"
      >
        이 레시피로 다시 요리하기 🍳
      </Link>
    </div>
  );
}
