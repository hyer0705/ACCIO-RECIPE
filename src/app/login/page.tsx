'use client';

import { Button } from '@/components/ui/button';
import { useLogin } from '@/hooks/useLogin';

export default function LoginPage() {
  const { isLoading, handleSignIn } = useLogin();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#FFF8E8]">
      {/* Title */}
      <div className="text-center mb-16">
        <h1 className="text-6xl font-black tracking-tight text-[#F05A28] font-serif">
          ACCIO RECIPE
        </h1>
        <p className="mt-3 text-sm text-[#999]">AI 레시피 분석 및 요리 보조 서비스</p>
      </div>

      {/* Login Buttons */}
      <div className="flex flex-col gap-3 w-64">
        <Button
          id="btn-login-kakao"
          className="w-full py-6 rounded-xl font-bold text-sm bg-[#FEE500] text-[#1A1A1A] hover:bg-[#f5dc00] hover:text-[#1A1A1A] shadow-none"
          onClick={() => handleSignIn('kakao')}
          disabled={isLoading !== null}
        >
          {isLoading === 'kakao' ? '연결 중...' : '카카오 로그인'}
        </Button>

        <Button
          id="btn-login-naver"
          className="w-full py-6 rounded-xl font-bold text-sm bg-[#03C75A] text-white hover:bg-[#02b350] shadow-none"
          onClick={() => handleSignIn('naver')}
          disabled={isLoading !== null}
        >
          {isLoading === 'naver' ? '연결 중...' : '네이버 로그인'}
        </Button>

        <Button
          id="btn-login-google"
          variant="outline"
          className="w-full py-6 rounded-xl font-semibold text-sm border-[#E0E0E0] text-[#333] hover:bg-gray-50 shadow-none"
          onClick={() => handleSignIn('google')}
          disabled={isLoading !== null}
        >
          {isLoading === 'google' ? '연결 중...' : 'Google 로그인'}
        </Button>
      </div>
    </div>
  );
}
