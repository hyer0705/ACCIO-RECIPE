/**
 * 인원 수 변경에 따른 재료량 재계산 (화면 표시 및 소수 변환용)
 * @param amount 원본 재료량
 * @param currentServings 현재 선택된 인원수
 * @param originalServings 레시피 본래의 기준 인원수
 * @returns 계산된 재료량 (문자열 또는 숫자)
 */
export const calculateDisplayAmount = (
  amount: number | null,
  currentServings: number,
  originalServings: number,
): string | number => {
  if (amount === null) return '';
  const ratio = currentServings / (originalServings || 1);
  const calculated = amount * ratio;

  if (calculated === 0) return 0;

  const integerPart = Math.floor(calculated);
  const fractionalPart = calculated - integerPart;

  if (fractionalPart < 0.01) return integerPart; // 딱 떨어지는 정수

  // 소수점 1자리로 보여줌
  return parseFloat(calculated.toFixed(1));
};
