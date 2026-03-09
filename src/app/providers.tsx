'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SessionProvider } from 'next-auth/react';
import { useState } from 'react';
import GlobalExtractionToast from '@/components/recipe/GlobalExtractionToast';
import { useExtractionRefresh } from '@/hooks/recipe/useExtractionRefresh';

// 내부에서 훅을 실행하기 위한 래퍼 (QueryClientProvider 내부에서 호출되어야 함)
function ExtractionLogicWrapper({ children }: { children: React.ReactNode }) {
  useExtractionRefresh();
  return (
    <>
      {children}
      <GlobalExtractionToast />
    </>
  );
}

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <ExtractionLogicWrapper>{children}</ExtractionLogicWrapper>
      </SessionProvider>
    </QueryClientProvider>
  );
}
