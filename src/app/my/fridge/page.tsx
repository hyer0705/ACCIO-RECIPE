'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';

interface FridgeItem {
  item_id: number;
  name: string;
  icon_url: string | null;
  quantity: number | null;
  unit: string | null;
  expiry_date: string | null;
  d_day: number | null;
}

export default function MyFridgePage() {
  const {
    data: items,
    isLoading,
    isError,
  } = useQuery<FridgeItem[]>({
    queryKey: ['fridge-items'],
    queryFn: async () => {
      const res = await fetch('/api/fridge');
      if (!res.ok) throw new Error('Failed to fetch fridge items');
      const json = await res.json();
      return json.data;
    },
  });

  if (isLoading) {
    return (
      <div className="max-w-[1000px] flex flex-col h-full items-center justify-center text-[#A59A94]">
        로딩 중...
      </div>
    );
  }

  if (isError || !items) {
    return (
      <div className="max-w-[1000px] flex flex-col h-full items-center justify-center text-[#EF4444]">
        데이터를 불러오는데 실패했습니다.
      </div>
    );
  }

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
        {items.length === 0 ? (
          <div className="text-center text-[#A59A94] py-10 bg-white rounded-[20px] shadow-sm">
            등록된 식재료가 없습니다.
          </div>
        ) : (
          items.map((item) => {
            const isUrgent = item.d_day !== null && item.d_day <= 3;

            return (
              <div
                key={item.item_id}
                className="bg-white rounded-[20px] px-8 py-5 flex items-center shadow-sm"
              >
                <div className="flex-1 text-[16px] font-bold text-[#3C2D23] flex items-center gap-2">
                  <span>{item.icon_url ? '🥗' : '🥕'}</span> {item.name}
                </div>
                <div className="w-[120px] text-[15px] font-medium text-[#3C2D23]">
                  {item.quantity !== null ? item.quantity : '-'}
                  {item.unit ? ` ${item.unit}` : ''}
                </div>
                <div className="flex-1 flex justify-between items-center text-[15px]">
                  {item.expiry_date ? (
                    <span
                      className={`font-medium ${isUrgent ? 'text-[#EF4444]' : 'text-[#3C2D23]'}`}
                    >
                      {item.expiry_date.replaceAll('-', '. ')}
                      {isUrgent &&
                        ` (D${item.d_day! <= 0 ? (item.d_day === 0 ? '-Day' : `+${Math.abs(item.d_day!)}`) : `-${item.d_day}`})`}
                    </span>
                  ) : (
                    <span className="text-gray-400 font-medium">기한 없음</span>
                  )}
                  <Link
                    href={`/my/fridge/${item.item_id}/edit`}
                    className="bg-[#F8F9FA] text-[#8C847E] text-[13px] px-4 py-1.5 rounded-lg border border-[#E9ECEF] hover:bg-[#E9ECEF] transition-colors font-medium"
                  >
                    수정
                  </Link>
                </div>
              </div>
            );
          })
        )}
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
