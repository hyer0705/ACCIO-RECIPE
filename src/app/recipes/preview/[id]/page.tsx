'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import Header from '@/components/layout/Header';
import RecipePreview from '@/components/recipe/RecipePreview';
import { useQuery } from '@tanstack/react-query';
import React, { useEffect, useRef } from 'react';
import { ExtractedRecipeData } from '@/store/useRecipeStore';

interface RecipeResponse {
  data?: {
    status?: string;
    errorReason?: string;
    requested_servings?: number;
    base_servings?: number;
  } & Partial<ExtractedRecipeData>;
}

export default function PreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = React.use(params);
  const recipeId = unwrappedParams.id;
  const searchParams = useSearchParams();
  const initialServings = searchParams.get('servings')
    ? parseInt(searchParams.get('servings') as string, 10)
    : null;

  const {
    data: recipeResponse,
    isLoading,
    isError,
  } = useQuery<RecipeResponse, Error, RecipeResponse>({
    queryKey: ['recipe', recipeId, initialServings],
    queryFn: async () => {
      // API 자체도 servings 쿼리를 받으면 배율을 이미 계산해서 리턴하도록 구현되어 있음
      const url = initialServings
        ? `/api/recipes/${recipeId}?servings=${initialServings}`
        : `/api/recipes/${recipeId}`;
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) {
        throw new Error('API Error');
      }
      return res.json();
    },
    refetchInterval: (query) => {
      const currentStatus = query.state.data?.data?.status;
      const hasPopulatedData =
        (query.state.data?.data?.ingredients?.length ?? 0) > 0 ||
        (query.state.data?.data?.steps?.length ?? 0) > 0;

      // 재료나 순서가 이미 있는 DB 기존 레시피는 polling하지 않음
      if (currentStatus === 'PENDING' && !hasPopulatedData) {
        return 3000;
      }
      return false;
    },
  });

  const status = recipeResponse?.data?.status;
  const hasPopulatedData =
    (recipeResponse?.data?.ingredients?.length ?? 0) > 0 ||
    (recipeResponse?.data?.steps?.length ?? 0) > 0;

  // 과거 레시피는 status가 PENDING이어도 이미 데이터가 존재할 수 있음
  const isActuallyPending = status === 'PENDING' && !hasPopulatedData;
  const recipeData = recipeResponse?.data;

  const previousTitleRef = useRef<string>('');

  // 1. 컴포넌트 마운트 시 최초 제목을 저장하고, 언마운트 시에만 복구 (관심사 분리)
  useEffect(() => {
    previousTitleRef.current = document.title;
    return () => {
      document.title = previousTitleRef.current;
    };
  }, []);

  // 2. 레시피 제목이 변경될 때 문서 타이틀 업데이트 (클린업 없음 -> 깜빡임 방지)
  useEffect(() => {
    const displayTitle =
      recipeData?.title && recipeData.title !== '이름 모를 레시피'
        ? `${recipeData.title} | 레시피 분석 리포트`
        : '레시피 분석 리포트';

    document.title = displayTitle;
  }, [recipeData?.title]);

  if (isActuallyPending) {
    return (
      <div className="h-screen flex flex-col font-sans overflow-hidden">
        <Header />
        <LoadingReportUI title={recipeData?.title} />
      </div>
    );
  }

  // 데이터가 아직 아예 없으면서 로딩 중일 때만 초기 로딩 UI 표시
  // recipeResponse가 undefined거나, 속성 'data'가 없는 경우를 처리하기 위해 in 연산자 사용
  const hasData =
    recipeResponse &&
    typeof recipeResponse === 'object' &&
    'data' in recipeResponse &&
    !!recipeResponse.data;

  if (isLoading && !hasData) {
    return (
      <div className="h-screen flex flex-col font-sans overflow-hidden">
        <Header />
        <InitialLoadingUI />
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

  if (!recipeData) {
    return null;
  }

  // API가 보내준 base_servings 대신 실제 화면에 쓰일 servings 값(requested_servings)을 보장
  const finalRecipeData = {
    ...recipeData,
    servings: recipeData.requested_servings || recipeData.base_servings || recipeData.servings || 1,
  };

  return (
    <div className="h-screen flex flex-col bg-[#FAF6E9] font-sans overflow-hidden">
      <Header />
      <main className="flex-1 overflow-hidden">
        <RecipePreview data={finalRecipeData as ExtractedRecipeData} />
      </main>
    </div>
  );
}

// 간단한 초기 로딩용 UI 컴포넌트 (데이터 로딩 중)
function InitialLoadingUI() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-[#FAF6E9] p-4 text-center">
      <div className="w-12 h-12 border-4 border-[#FF6B00] border-t-transparent rounded-full animate-spin mb-4"></div>
      <h2 className="text-[18px] font-bold text-gray-800">레시피 정보를 불러오고 있어요... 👩‍🍳</h2>
    </div>
  );
}

// AI 분석 중일 때 보여지는 UI 컴포넌트
function LoadingReportUI({ title }: { title?: string }) {
  const displayTitle = title && title !== '이름 모를 레시피' ? title : '레시피';

  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-[#FAF6E9] p-4 text-center">
      <div className="w-16 h-16 border-4 border-[#FF6B00] border-t-transparent rounded-full animate-spin mb-6"></div>
      <h2 className="text-2xl font-bold text-gray-800 mb-2">
        AI가 <span className="text-[#FF6B00]">{displayTitle}</span>를 분석하고 있어요 👩‍🍳
      </h2>
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
