import swaggerJSDoc from 'swagger-jsdoc';

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Accio Recipe API',
      version: '1.0.0',
      description: `
## 🔐 API 인증 방법 (Swagger 테스트 가이드)

이 API는 **NextAuth 세션 쿠키** 기반 인증을 사용합니다.

Swagger UI에서 인증이 필요한 API를 테스트하려면:
1. **[/login](/login)** 페이지에서 소셜 로그인을 완료합니다.
2. 로그인 후 이 Swagger UI 페이지로 돌아옵니다.
3. 브라우저가 자동으로 세션 쿠키를 포함하여 요청을 보냅니다.
4. 이제 인증이 필요한 API도 "Try it out" 버튼으로 테스트할 수 있습니다.

> ⚠️ Swagger UI의 "Authorize" 버튼은 쿠키 인증에 적용되지 않습니다. 반드시 실제 로그인 후 테스트하세요.`,
    },
    components: {
      securitySchemes: {
        cookieAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'next-auth.session-token', // For next-auth
          description: 'NextAuth Session Cookie',
        },
      },
    },
    security: [
      {
        cookieAuth: [],
      },
    ],
  },
  apis: ['src/app/api/**/*.ts'], // Path to the API routes
};

export const getApiDocs = async () => {
  return swaggerJSDoc(swaggerOptions);
};
