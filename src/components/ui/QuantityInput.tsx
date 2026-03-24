'use client';

interface QuantityInputProps {
  quantity: number;
  onIncrease: () => void;
  onDecrease: () => void;
  label?: string; // 추가적인 접근성이나 레이블용 (옵션)
  min?: number;
  disableDecrease?: boolean;
}

export function QuantityInput({
  quantity,
  onIncrease,
  onDecrease,
  label = '수량',
  min = 1,
  disableDecrease = false,
}: QuantityInputProps) {
  const isDecreaseDisabled = disableDecrease || quantity <= min;

  return (
    <div className="flex justify-between items-center bg-[#FAFAFA] border border-[#EBEBEB] rounded-2xl px-5 py-3">
      <span
        aria-live="polite"
        aria-atomic="true"
        className="text-[15px] font-medium text-[#3C2D23]"
      >
        {quantity} 개
      </span>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => {
            if (!isDecreaseDisabled) {
              onDecrease();
            }
          }}
          aria-label={`${label} 감소`}
          disabled={isDecreaseDisabled}
          aria-disabled={isDecreaseDisabled}
          className={`w-[34px] h-[34px] rounded-full flex items-center justify-center text-[18px] font-medium transition-colors pb-0.5 ${
            isDecreaseDisabled
              ? 'bg-[#F2F2F2] text-[#C9C3BF] cursor-not-allowed'
              : 'cursor-pointer bg-[#EBEBEB] text-[#8C847E] hover:bg-[#D9D9D9]'
          }`}
        >
          -
        </button>
        <button
          type="button"
          onClick={onIncrease}
          aria-label={`${label} 증가`}
          className="cursor-pointer w-[34px] h-[34px] rounded-full bg-[#FF5A28] flex items-center justify-center text-[20px] text-white font-medium hover:bg-[#E04D20] transition-colors pb-0.5"
        >
          +
        </button>
      </div>
    </div>
  );
}
