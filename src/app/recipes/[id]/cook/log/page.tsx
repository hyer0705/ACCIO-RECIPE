'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/layout/Header';

const STATUS_OPTIONS = [
  {
    value: 'SUCCESS',
    label: '😊 성공',
    activeColor: 'bg-green-100 border-green-400 text-green-700',
    inactiveColor: 'bg-white border-gray-200 text-gray-500',
  },
  {
    value: 'REGRET',
    label: '😔 아쉬움',
    activeColor: 'bg-yellow-100 border-yellow-400 text-yellow-700',
    inactiveColor: 'bg-white border-gray-200 text-gray-500',
  },
  {
    value: 'FAIL',
    label: '😢 실패',
    activeColor: 'bg-red-100 border-red-400 text-red-700',
    inactiveColor: 'bg-white border-gray-200 text-gray-500',
  },
];

const COMPANION_OPTIONS = ['가족', '연인', '친구'];

interface Props {
  params: Promise<{ id: string }>;
}

export default function CookLogPage({ params }: Props) {
  const router = useRouter();
  const [status, setStatus] = useState<'SUCCESS' | 'REGRET' | 'FAIL'>('SUCCESS');
  const [lessonNote, setLessonNote] = useState('');
  const [companion, setCompanion] = useState('');
  const [customCompanion, setCustomCompanion] = useState('');
  const [isCustom, setIsCustom] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const resolvedParams = await params;
      const recipeId = parseInt(resolvedParams.id, 10);
      const finalCompanion = isCustom ? customCompanion.trim() : companion;

      const res = await fetch('/api/cooking-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipe_id: recipeId,
          status,
          lesson_note: lessonNote.trim() || undefined,
          companion: finalCompanion || undefined,
        }),
      });

      if (!res.ok) throw new Error('저장 실패');

      router.push('/my/dashboard');
    } catch {
      alert('저장 중 오류가 발생했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSkip = () => {
    router.push('/my/dashboard');
  };

  return (
    <div className="min-h-screen bg-[#FAF6E9]">
      <Header />
      <div className="flex items-center justify-center min-h-[calc(100vh-80px)] px-4">
        <div className="bg-white rounded-[2rem] shadow-sm p-10 w-full max-w-lg">
          <h1 className="text-2xl font-bold text-[#3C2D23] text-center mb-2">요리 기록하기</h1>
          <p className="text-sm text-gray-400 text-center mb-8">
            저장된 데이터는 다음 조리 시 AI 가이드로 자동 호출됩니다.
          </p>

          {/* 성공/아쉬움/실패 */}
          <div className="flex gap-3 mb-8">
            {STATUS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setStatus(opt.value as typeof status)}
                className={`flex-1 py-3 rounded-2xl border-2 font-bold text-sm transition-all cursor-pointer ${
                  status === opt.value ? opt.activeColor : opt.inactiveColor
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* 요리 경험 기록 */}
          <label className="block text-sm font-bold text-[#3C2D23] mb-2">
            오늘의 요리 경험 기록 (선택)
          </label>
          <textarea
            value={lessonNote}
            onChange={(e) => setLessonNote(e.target.value)}
            placeholder="예: 양파를 5분 더 볶으니 단맛이 확 살아남. 기록해둘 것."
            rows={4}
            className="w-full border border-gray-200 rounded-2xl p-4 text-sm text-[#3C2D23] outline-none focus:ring-2 focus:ring-[#FF5A28]/40 resize-none mb-8"
          />

          {/* 누구와 함께 */}
          <label className="block text-sm font-bold text-[#3C2D23] mb-3">
            누구와 함께 먹었나요? (선택)
          </label>
          <div className="flex flex-wrap gap-2 mb-8">
            {COMPANION_OPTIONS.map((c) => (
              <button
                key={c}
                onClick={() => {
                  setCompanion(c);
                  setIsCustom(false);
                }}
                className={`px-4 py-2 rounded-full text-sm font-semibold border transition-all cursor-pointer ${
                  companion === c && !isCustom
                    ? 'bg-[#FF5A28] text-white border-[#FF5A28]'
                    : 'border-gray-300 text-gray-500 hover:border-gray-400'
                }`}
              >
                {c}
              </button>
            ))}
            {isCustom ? (
              <input
                autoFocus
                type="text"
                value={customCompanion}
                onChange={(e) => setCustomCompanion(e.target.value)}
                placeholder="직접 입력"
                className="px-4 py-2 rounded-full text-sm border-2 border-[#FF5A28] outline-none text-[#3C2D23] w-32"
              />
            ) : (
              <button
                onClick={() => {
                  setIsCustom(true);
                  setCompanion('');
                }}
                className="px-4 py-2 rounded-full text-sm font-semibold border-2 border-dashed border-gray-300 text-gray-400 hover:border-gray-500 cursor-pointer"
              >
                + 직접 입력
              </button>
            )}
          </div>

          {/* 저장 버튼 */}
          <div className="flex flex-col gap-3">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="w-full h-14 bg-[#3C2D23] text-white font-bold text-lg rounded-2xl hover:bg-[#2e221a] transition-colors disabled:opacity-60 cursor-pointer"
            >
              {isSaving ? '저장 중...' : '성장 데이터로 저장하기'}
            </button>
            <button
              onClick={handleSkip}
              className="w-full text-gray-400 text-sm font-medium hover:text-gray-600 underline underline-offset-4 py-2 cursor-pointer"
            >
              기록 건너뛰기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
