'use client';

import { useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Calendar, ChevronLeft } from 'lucide-react';
import { QuantityInput } from '@/components/ui/QuantityInput';

// Data Interface
interface FridgeItem {
  item_id: number;
  name: string;
  icon_url: string | null;
  quantity: number | null;
  unit: string | null;
  expiry_date: string | null;
  d_day: number | null;
}

/**
 * 실제 폼을 담당하는 컴포넌트입니다.
 * 부모로부터 초기 데이터를 받아 useState의 초기값으로 직접 주입하여 useEffect 사용을 배제합니다.
 */
function EditFridgeItemForm({
  initialData,
  resolvedParams,
}: {
  initialData: FridgeItem;
  resolvedParams: { id: string };
}) {
  const router = useRouter();
  const queryClient = useQueryClient();

  // 데이터를 props로 받았으므로, useState 초기값으로 즉시 설정 가능 (ESLint 에러 해결)
  const [name] = useState(initialData.name);
  const [quantity, setQuantity] = useState(
    initialData.quantity !== null ? Number(initialData.quantity) : 1,
  );
  const [expiryDate, setExpiryDate] = useState(
    initialData.expiry_date ? initialData.expiry_date.replaceAll('. ', '-') : '',
  );

  const editMutation = useMutation({
    mutationFn: async (updatedItem: { quantity: number; expiry_date?: string }) => {
      const res = await fetch(`/api/fridge/${resolvedParams.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedItem),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to update item');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fridge-items'] });
      router.push('/my/fridge');
    },
    onError: (error) => {
      alert(error.message);
    },
  });

  const handleIncrease = () => setQuantity((q) => q + 1);
  const handleDecrease = () => setQuantity((q) => Math.max(1, q - 1));

  const handleSubmit = () => {
    editMutation.mutate({
      quantity,
      ...(expiryDate ? { expiry_date: expiryDate } : {}),
    });
  };

  return (
    <div className="bg-white rounded-[32px] p-10 shadow-sm w-full max-w-[600px]">
      {/* Item Name (Read-only representation) */}
      <div className="mb-8">
        <label className="block text-[15px] font-bold text-[#3C2D23] mb-3">재료 이름</label>
        <div className="w-full bg-[#F5F5F5] border border-[#EBEBEB] rounded-2xl px-5 py-4 flex items-center">
          <span className="text-[15px] font-bold text-[#3C2D23]">🥚 {name}</span>
        </div>
      </div>

      {/* Quantity Selection */}
      <div className="mb-8">
        <label className="block text-[15px] font-bold text-[#3C2D23] mb-3">수량 수정</label>
        <QuantityInput
          quantity={quantity}
          onIncrease={handleIncrease}
          onDecrease={handleDecrease}
          label="수량 수정"
        />
      </div>

      {/* Expiry Date */}
      <div className="mb-12">
        <label className="block text-[15px] font-bold text-[#3C2D23] mb-3">유통기한</label>
        <div className="flex justify-between items-center bg-[#FAFAFA] border border-[#EBEBEB] rounded-2xl px-5 py-4 cursor-pointer focus-within:border-[#FF5A28] transition-colors relative">
          <input
            type="date"
            value={expiryDate}
            onChange={(e) => setExpiryDate(e.target.value)}
            className="bg-transparent text-[15px] font-medium text-[#3C2D23] outline-none flex-1 cursor-pointer w-full [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full"
          />
          <div className="absolute right-5 pointer-events-none">
            <Calendar className="text-[#3C2D23] w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Submit Button */}
      <button
        onClick={handleSubmit}
        disabled={editMutation.isPending}
        className="w-full bg-[#3C2D23] text-white py-5 rounded-[20px] font-bold text-[16px] hover:bg-[#2A1F18] transition-colors shadow-sm disabled:opacity-50"
      >
        {editMutation.isPending ? '수정 중...' : '수정 완료'}
      </button>
    </div>
  );
}

/**
 * 페이지 엔트리 컴포넌트입니다.
 * 데이터 패칭(Loading 상태)만 관리하고, 데이터가 준비되면 폼 컴포넌트를 렌더링합니다.
 */
export default function EditFridgeItemPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const itemId = parseInt(resolvedParams.id, 10);

  const { data: itemData, isLoading } = useQuery({
    queryKey: ['fridge-items'],
    queryFn: async () => {
      const res = await fetch('/api/fridge');
      if (!res.ok) throw new Error('Failed to fetch fridge items');
      const json = await res.json();
      return json.data;
    },
    select: (data: FridgeItem[]) => data.find((i) => i.item_id === itemId),
  });

  return (
    <div className="max-w-[1000px] flex flex-col items-center">
      <div className="w-full max-w-[600px] flex items-center justify-center mb-10 relative">
        <button
          onClick={() => router.push('/my/fridge')}
          className="cursor-pointer absolute left-0 p-2 text-[#3C2D23] hover:bg-gray-200 rounded-full transition-colors flex items-center justify-center"
        >
          <ChevronLeft className="w-7 h-7" />
        </button>
        <h1 className="text-[28px] font-bold text-[#3C2D23] m-0">재료 정보 수정</h1>
      </div>

      {isLoading ? (
        <div className="bg-white rounded-[32px] p-20 shadow-sm w-full max-w-[600px] flex items-center justify-center">
          <span className="text-[#A59A94] font-medium">데이터 불러오는 중...</span>
        </div>
      ) : itemData ? (
        <EditFridgeItemForm initialData={itemData} resolvedParams={resolvedParams} />
      ) : (
        <div className="bg-white rounded-[32px] p-20 shadow-sm w-full max-w-[600px] flex items-center justify-center text-[#EF4444]">
          데이터를 찾을 수 없습니다.
        </div>
      )}
    </div>
  );
}
