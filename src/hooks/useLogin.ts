import { signIn } from 'next-auth/react';
import { useState } from 'react';

type Provider = 'kakao' | 'naver' | 'google';

interface UseLoginReturn {
  isLoading: Provider | null;
  handleSignIn: (provider: Provider) => Promise<void>;
}

export function useLogin(): UseLoginReturn {
  const [isLoading, setIsLoading] = useState<Provider | null>(null);

  const handleSignIn = async (provider: Provider) => {
    setIsLoading(provider);
    try {
      await signIn(provider, { callbackUrl: '/' });
    } finally {
      // signIn은 페이지를 리다이렉트하므로 finally는 에러 시에만 실행됨
      setIsLoading(null);
    }
  };

  return { isLoading, handleSignIn };
}
