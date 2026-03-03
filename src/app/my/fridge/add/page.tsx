import { Calendar } from 'lucide-react';

export default function AddFridgeItemPage() {
  return (
    <div className="max-w-[1000px] flex flex-col items-center">
      <h1 className="text-[28px] font-bold text-[#3C2D23] mb-10 w-full text-center">
        새 재료 추가하기
      </h1>

      <div className="bg-white rounded-[32px] p-10 shadow-sm w-full max-w-[600px]">
        {/* Item Name */}
        <div className="mb-8">
          <label className="block text-[15px] font-bold text-[#3C2D23] mb-3">재료 이름</label>
          <input
            type="text"
            placeholder="예: 대파, 차돌박이, 우유 등"
            className="w-full bg-[#FAFAFA] border border-[#EBEBEB] rounded-2xl px-5 py-4 text-[15px] text-[#3C2D23] placeholder-[#A59A94] outline-none focus:border-[#FF5A28] transition-colors"
          />
        </div>

        {/* Quantity */}
        <div className="mb-8">
          <label className="block text-[15px] font-bold text-[#3C2D23] mb-3">수량</label>
          <div className="flex justify-between items-center bg-[#FAFAFA] border border-[#EBEBEB] rounded-2xl px-5 py-3">
            <span className="text-[15px] font-medium text-[#3C2D23]">1 개</span>
            <div className="flex gap-3">
              <button className="w-[34px] h-[34px] rounded-full bg-[#EBEBEB] flex items-center justify-center text-[18px] text-[#8C847E] font-medium hover:bg-[#D9D9D9] transition-colors pb-0.5">
                -
              </button>
              <button className="w-[34px] h-[34px] rounded-full bg-[#FF5A28] flex items-center justify-center text-[20px] text-white font-medium hover:bg-[#E04D20] transition-colors pb-0.5">
                +
              </button>
            </div>
          </div>
        </div>

        {/* Expiry Date */}
        <div className="mb-12">
          <label className="block text-[15px] font-bold text-[#3C2D23] mb-3">유통기한</label>
          <div className="flex justify-between items-center bg-[#FAFAFA] border border-[#EBEBEB] rounded-2xl px-5 py-4 cursor-pointer focus-within:border-[#FF5A28] transition-colors">
            <input
              type="text"
              defaultValue="2026. 02. 25"
              className="bg-transparent text-[15px] font-medium text-[#3C2D23] outline-none flex-1 cursor-pointer"
              readOnly
            />
            <Calendar className="text-[#3C2D23] w-6 h-6" />
          </div>
        </div>

        {/* Submit Button */}
        <button className="w-full bg-[#FF5A28] text-white py-5 rounded-[20px] font-bold text-[16px] hover:bg-[#E04D20] transition-colors shadow-sm">
          저장하기
        </button>
      </div>
    </div>
  );
}
