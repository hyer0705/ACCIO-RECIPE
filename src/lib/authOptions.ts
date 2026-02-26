import { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import KakaoProvider from 'next-auth/providers/kakao';
import NaverProvider from 'next-auth/providers/naver';
import prisma from './prisma';

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    }),
    KakaoProvider({
      clientId: process.env.KAKAO_CLIENT_ID || '',
      clientSecret: process.env.KAKAO_CLIENT_SECRET || '',
    }),
    NaverProvider({
      clientId: process.env.NAVER_CLIENT_ID || '',
      clientSecret: process.env.NAVER_CLIENT_SECRET || '',
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async signIn({ user, account }) {
      if (!account) return false;

      const provider = account.provider as 'google' | 'kakao' | 'naver';
      const socialId = account.providerAccountId;

      try {
        // 기존 유저 확인
        let existingUser = await prisma.users.findUnique({
          where: { social_id: socialId },
        });

        if (!existingUser) {
          // 신규 유저 생성 (가회원 상태)
          existingUser = await prisma.users.create({
            data: {
              nickname: user.name || '임시닉네임',
              email: user.email,
              social_provider: provider,
              social_id: socialId,
              terms_agreements: false,
              user_settings: {
                create: {
                  alert_timer: true,
                  alert_expiry: true,
                  auto_export_enabled: false,
                },
              },
            },
          });
        }

        // user 세션 객체에 커스텀 DB의 user_id 등을 추가
        user.id = existingUser.user_id.toString();
        user.isComplete = existingUser.terms_agreements;

        return true;
      } catch (error) {
        console.error('Error during signIn via NextAuth:', error);
        return false;
      }
    },
    async jwt({ token, user, trigger, session }) {
      // 최초 로그인 시 user 객체가 전달됨
      if (user) {
        token.sub = user.id;
        token.isComplete = user.isComplete;
      }

      // 튜토리얼/약관동의 후 세션 업데이트 (signup 완료 시)
      if (trigger === 'update' && session?.isComplete) {
        token.isComplete = session.isComplete;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub as string;
        session.user.isComplete = token.isComplete as boolean;
      }
      return session;
    },
  },
  pages: {
    // signIn: "/login", // 커스텀 로그인 페이지가 있다면 여기에 경로 추가
  },
  secret: process.env.NEXTAUTH_SECRET,
};
