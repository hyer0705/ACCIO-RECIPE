import { ChevronLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function ArchiveDetailHeader({
  title,
  cookCount,
}: {
  title: string;
  cookCount: number;
}) {
  const router = useRouter();

  return (
    <div className="flex items-center gap-4 mb-8">
      <button
        onClick={() => router.push('/my/archive')}
        className="cursor-pointer p-2.5 text-[#3C2D23] hover:bg-white bg-white rounded-full transition-colors flex items-center justify-center -ml-2 border border-[#EAE7E4] shadow-sm"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>
      <h1 className="text-[28px] font-bold text-[#3C2D23]">{title}</h1>
      {cookCount > 0 && (
        <span className="px-3 py-1 rounded-full border border-[#FF5A28] text-[#FF5A28] text-[13px] font-bold bg-white">
          {cookCount}회 조리
        </span>
      )}
    </div>
  );
}
