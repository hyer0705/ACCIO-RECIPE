import { useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface SignupFormState {
  nickname: string;
  termsService: boolean;
  termsPrivacy: boolean;
}

interface UseSignupReturn {
  formState: SignupFormState;
  isLoading: boolean;
  error: string;
  setNickname: (value: string) => void;
  setTermsService: (value: boolean) => void;
  setTermsPrivacy: (value: boolean) => void;
  handleSubmit: () => Promise<void>;
}

export function useSignup(): UseSignupReturn {
  const { data: session, update } = useSession();
  const router = useRouter();

  const [formState, setFormState] = useState<SignupFormState>({
    nickname: '',
    termsService: false,
    termsPrivacy: false,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // 세션의 닉네임을 초기값으로 설정
  useEffect(() => {
    if (session?.user?.name) {
      setFormState((prev) => ({ ...prev, nickname: session.user?.name ?? '' }));
    }
  }, [session]);

  const setNickname = (value: string) => {
    setFormState((prev) => ({ ...prev, nickname: value }));
  };

  const setTermsService = (value: boolean) => {
    setFormState((prev) => ({ ...prev, termsService: value }));
  };

  const setTermsPrivacy = (value: boolean) => {
    setFormState((prev) => ({ ...prev, termsPrivacy: value }));
  };

  const handleSubmit = async () => {
    const { nickname, termsService, termsPrivacy } = formState;

    if (!nickname.trim()) {
      setError('닉네임을 입력해 주세요.');
      return;
    }
    if (!termsService || !termsPrivacy) {
      setError('필수 약관에 모두 동의해 주세요.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nickname: nickname.trim(),
          terms_agreements: true,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || '오류가 발생했습니다.');
      }

      await update({ isComplete: true });
      router.push('/');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  return {
    formState,
    isLoading,
    error,
    setNickname,
    setTermsService,
    setTermsPrivacy,
    handleSubmit,
  };
}
