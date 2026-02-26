'use client';

import { signIn } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { useSignup } from '@/hooks/useSignup';

export default function SignupPage() {
  const {
    formState,
    isLoading,
    error,
    setNickname,
    setTermsService,
    setTermsPrivacy,
    handleSubmit,
  } = useSignup();

  const { nickname, termsService, termsPrivacy } = formState;

  // 로그인이 안 된 경우 로그인 유도
  if (nickname === '' && !isLoading) {
    // 세션이 없는 경우를 위한 fallback — useSignup에서 세션을 통해 닉네임을 설정하므로
    // 로딩 완료 후에도 세션 없으면 안내
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#FFF8E8]">
      {/* Header */}
      <header className="px-6 py-4 border-b border-orange-100 bg-white">
        <span className="font-black text-sm tracking-tight text-[#F05A28] font-serif">
          ACCIO RECIPE
        </span>
      </header>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-[540px] bg-white rounded-2xl p-8 shadow-sm">
          {/* Title */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-[#2D1A0E]">서비스 이용 설정</h1>
            <p className="mt-2 text-sm text-[#AAA]">
              회원가입 완료를 위해 아래 정보를 확인해 주세요.
            </p>
          </div>

          {/* Nickname */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-[#333] mb-2" htmlFor="input-nickname">
              사용자 닉네임
            </label>
            <input
              id="input-nickname"
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className="w-full px-4 py-3 rounded-xl text-sm border border-[#E8E8E8] bg-[#FAFAFA] text-[#333] outline-none focus:ring-2 focus:ring-[#F05A28]/30 transition"
              placeholder="닉네임을 입력하세요"
            />
          </div>

          {/* Terms */}
          <div className="mb-8">
            <label className="block text-sm font-medium text-[#333] mb-3">약관 동의</label>
            <div className="rounded-xl p-4 bg-[#F5F5F5] flex flex-col gap-3">
              <label className="flex items-center gap-3 cursor-pointer" htmlFor="terms-service">
                <input
                  id="terms-service"
                  type="checkbox"
                  checked={termsService}
                  onChange={(e) => setTermsService(e.target.checked)}
                  className="hidden"
                />
                <span
                  className={`w-3 h-3 rounded-full shrink-0 mt-0.5 transition-colors ${termsService ? 'bg-green-500' : 'bg-[#F05A28]'}`}
                />
                <span className="text-sm text-[#555]">[필수] 서비스 이용약관 동의</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer" htmlFor="terms-privacy">
                <input
                  id="terms-privacy"
                  type="checkbox"
                  checked={termsPrivacy}
                  onChange={(e) => setTermsPrivacy(e.target.checked)}
                  className="hidden"
                />
                <span
                  className={`w-3 h-3 rounded-full shrink-0 mt-0.5 transition-colors ${termsPrivacy ? 'bg-green-500' : 'bg-[#F05A28]'}`}
                />
                <span className="text-sm text-[#555]">[필수] 개인정보 수집 및 이용 동의</span>
              </label>
            </div>
          </div>

          {/* Error */}
          {error && <p className="text-xs mb-4 text-center text-[#F05A28]">{error}</p>}

          {/* Submit */}
          <Button
            id="btn-signup-submit"
            onClick={handleSubmit}
            disabled={isLoading}
            className="w-full py-6 rounded-full font-bold text-sm text-white bg-[#2D1A0E] hover:bg-[#4a2e1a] shadow-none"
          >
            {isLoading ? '처리 중...' : '로그인'}
          </Button>

          {/* Not logged in fallback */}
          <p className="text-center text-xs text-[#AAA] mt-4">
            소셜 로그인 후에 이 페이지를 이용할 수 있어요.{' '}
            <button
              onClick={() => signIn()}
              className="text-[#F05A28] underline underline-offset-2"
            >
              로그인하기
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
