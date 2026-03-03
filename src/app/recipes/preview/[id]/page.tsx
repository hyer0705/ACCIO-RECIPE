'use client';

import { useRouter } from 'next/navigation';
import Header from '@/components/layout/Header';
import RecipePreview from '@/components/recipe/RecipePreview';
import { useQuery } from '@tanstack/react-query';
import React from 'react';

// 간단한 로딩용 Skeleton 컴포넌트
function LoadingReportUI() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-[#FAF6E9] p-4 text-center">
      <div className="w-16 h-16 border-4 border-[#FF6B00] border-t-transparent rounded-full animate-spin mb-6"></div>
      <h2 className="text-2xl font-bold text-gray-800 mb-2">AI가 레시피를 분석하고 있어요 👩‍🍳</h2>
      <p className="text-gray-500">
        최대 10~20초 정도 소요될 수 있어요.
        <br />이 페이지를 벗어나셔도 추출은 백그라운드에서 진행됩니다!
      </p>
    </div>
  );
}

// 실패 시 UI 컴포넌트
function FailedReportUI({ reason }: { reason?: string }) {
  const router = useRouter();

  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-[#FAF6E9] p-4 text-center">
      <div className="text-6xl mb-4">😢</div>
      <h2 className="text-2xl font-bold text-gray-800 mb-2">
        앗, 레시피 데이터를 가져오지 못했어요!
      </h2>
      <p className="text-red-500 mb-6 bg-red-50 p-3 rounded-lg border border-red-200">
        {reason || '알 수 없는 이유로 분석에 실패했어요.'}
      </p>
      <button
        onClick={() => router.push('/')}
        className="px-6 py-3 bg-[#FF6B00] text-white rounded-xl font-bold hover:bg-[#E65A00] transition-colors"
      >
        홈으로 돌아가서 다시 시도하기
      </button>
    </div>
  );
}

export default function PreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = React.use(params);
  const recipeId = unwrappedParams.id;

  const {
    data: recipeResponse,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['recipe', recipeId],
    queryFn: async () => {
      const res = await fetch(`/api/recipes/${recipeId}`);
      if (!res.ok) {
        throw new Error('API Error');
      }
      return res.json();
    },
    refetchInterval: (query) => {
      const currentStatus = query.state.data?.data?.status;
      // 데이터가 PENDING인 경우에만 3초에 한 번씩 서버에 상태를 확인합니다.
      if (currentStatus === 'PENDING') {
        return 3000;
      }
      return false; // 완료되었거나 에러가 났으면 백그라운드 확인을 중지합니다.
    },
  });

  if (isLoading || recipeResponse?.data?.status === 'PENDING') {
    return (
      <div className="h-screen flex flex-col font-sans overflow-hidden">
        <Header />
        <LoadingReportUI />
      </div>
    );
  }

  if (isError || recipeResponse?.data?.status === 'FAILED') {
    return (
      <div className="h-screen flex flex-col font-sans overflow-hidden">
        <Header />
        <FailedReportUI reason={recipeResponse?.data?.errorReason} />
      </div>
    );
  }

  if (!recipeResponse?.data) {
    return null;
  }

  const recipeData = recipeResponse.data;

  return (
    <div className="h-screen flex flex-col bg-[#FAF6E9] font-sans overflow-hidden">
      <Header />
      <main className="flex-1 overflow-hidden">
        <RecipePreview data={recipeData} />
      </main>
    </div>
  );
}
