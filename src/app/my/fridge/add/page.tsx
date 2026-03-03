'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Calendar, ChevronLeft } from 'lucide-react';
import { QuantityInput } from '@/components/ui/QuantityInput';

export default function AddFridgeItemPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [expiryDate, setExpiryDate] = useState(''); // YYYY-MM-DD

  const addMutation = useMutation({
    mutationFn: async (newItem: { name: string; quantity: number; expiry_date?: string }) => {
      const res = await fetch('/api/fridge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newItem),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to add item');
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
    if (!name.trim()) {
      alert('재료 이름을 입력해주세요.');
      return;
    }

    addMutation.mutate({
      name,
      quantity,
      ...(expiryDate ? { expiry_date: expiryDate } : {}),
    });
  };

  return (
    <div className="max-w-[1000px] flex flex-col items-center">
      <div className="w-full max-w-[600px] flex items-center justify-center mb-10 relative">
        <button
          onClick={() => router.push('/my/fridge')}
          className="cursor-pointer absolute left-0 p-2 text-[#3C2D23] hover:bg-gray-200 rounded-full transition-colors flex items-center justify-center"
        >
          <ChevronLeft className="w-7 h-7" />
        </button>
        <h1 className="text-[28px] font-bold text-[#3C2D23] m-0">새 재료 추가하기</h1>
      </div>

      <div className="bg-white rounded-[32px] p-10 shadow-sm w-full max-w-[600px]">
        {/* Item Name */}
        <div className="mb-8">
          <label className="block text-[15px] font-bold text-[#3C2D23] mb-3">재료 이름</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="예: 대파, 차돌박이, 우유 등"
            className="w-full bg-[#FAFAFA] border border-[#EBEBEB] rounded-2xl px-5 py-4 text-[15px] text-[#3C2D23] placeholder-[#A59A94] outline-none focus:border-[#FF5A28] transition-colors"
          />
        </div>

        {/* Quantity */}
        <div className="mb-8">
          <label className="block text-[15px] font-bold text-[#3C2D23] mb-3">수량</label>
          <QuantityInput
            quantity={quantity}
            onIncrease={handleIncrease}
            onDecrease={handleDecrease}
            label="수량"
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
          disabled={addMutation.isPending}
          className="w-full bg-[#FF5A28] text-white py-5 rounded-[20px] font-bold text-[16px] hover:bg-[#E04D20] transition-colors shadow-sm disabled:opacity-50"
        >
          {addMutation.isPending ? '저장 중...' : '저장하기'}
        </button>
      </div>
    </div>
  );
}
