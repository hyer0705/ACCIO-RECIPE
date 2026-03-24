# ACCIO RECIPE

**조리 UX 최적화를 제공하는 AI 보조 셰프 서비스**

따라하고 싶은 레시피 콘텐츠를 분석 및 추출하여 조리에 몰입할 수 있는 조리 UX를 제공하는 웹 애플리케이션입니다. 조리 중 화면 조작을 최소화하여 요리에 집중할 수 있게 돕고, 요리 과정에서 얻은 소중한 경험을 기록하여 개인의 요리 자산으로 남길 수 있습니다.

- **배포 주소:** [https://acciorecipe.work](https://acciorecipe.work)
- **저장소:** [https://github.com/hyer0705/ACCIO-RECIPE](https://github.com/hyer0705/ACCIO-RECIPE)

---

## 💡 주요 기능

- **LLM 기반 레시피 분석 및 추출:** YouTube 영상, 블로그 글 등의 외부 링크에서 핵심 레시피 정보(식재료, 조리 순서 등)를 자동 추출합니다.
- **조리 몰입형 UI/UX:** 요리 중 젖은 손으로도 화면 조작을 최소화할 수 있도록 설계된 최적화된 화면 인터페이스를 제공합니다.
- **요리 경험 기록:** 요리 시의 실패 기록, 맛에 대한 평가, 지인의 반응 등을 저장하여 나만의 레시피 데이터베이스로 활용할 수 있습니다.

---

## 🛠 기술 스택

### **Frontend**

- **Core:** Next.js 16 (App Router), React 19, TypeScript
- **Styling & UI:** Tailwind CSS v4, shadcn/ui
- **State & Data Handling:** Zustand, TanStack Query (React Query)
- **Form & Validation:** React Hook Form, Zod

### **Backend & Database**

- **API & Crawling:** Next.js API Routes, Cheerio
- **Database & ORM:** AWS RDS (MySQL), Prisma ORM
- **Auth & Docs:** NextAuth.js, Swagger (next-swagger-doc)

### **DevOps & Infrastructure**

- **Hosting & Security:** AWS EC2, Cloudflare (DNS/HTTPS)
- **Server Operation:** Nginx, PM2
- **CI/CD:** GitHub Actions

### **AI Pipeline**

- **LLM:** Google GenAI (Gemini API), AI Studio

---

## ⚙️ 설치 및 실행 방법

### 1. 프로젝트 클론

```bash
git clone https://github.com/hyer0705/ACCIO-RECIPE.git
cd ACCIO-RECIPE
```

### 2. 패키지 설치

```bash
npm install
```

### 3. 환경 변수 설정

프로젝트 루트 경로에 `.env` 파일을 생성하고 필요한 값을 입력해주세요. (하단의 **환경 변수** 섹션 참고)

### 4. 로컬 서버 실행

```bash
npm run dev
```

웹 브라우저에서 `http://localhost:3000`으로 접속하여 서비스를 확인합니다.

---

## 🔑 환경 변수

프로젝트 실행에 필요한 최소한의 `.env` 파일 예시입니다. 본인의 로컬 환경 및 API 키에 맞게 `PLACEHOLDER` 값을 변경하여 사용하세요.

```env
# Database (Prisma)
DATABASE_URL="mysql://유저명:비밀번호@호스트:포트/데이터베이스명"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="임의의_난수_문자열"

# Google Gemini API
GEMINI_API_KEY="본인의_GEMINI_API_키"
```

---

## 📁 폴더 구조

Next.js App Router 기반의 프로젝트 구조를 따르고 있습니다.

```text
ACCIO-RECIPE/
├── .github/          # GitHub Actions CI/CD 구성 및 템플릿
├── prisma/           # 스키마(schema.prisma) 및 마이그레이션 파일
├── public/           # 이미지, 아이콘 등 정적 에셋
├── src/
│   ├── app/          # Next.js 16 App Router (페이지 및 API 라우트)
│   ├── components/   # 재사용 가능한 공통 UI 컴포넌트
│   ├── hooks/        # 커스텀 React 훅
│   ├── lib/          # 유틸리티 함수 및 Prisma 클라이언트 설정 등
│   ├── store/        # Zustand 전역 상태 관리 로직
│   └── types/        # TypeScript 인터페이스 및 타입 정의
├── package.json      # 프로젝트 의존성 및 스크립트
└── tsconfig.json     # TypeScript 설정
```

---

## 🚀 사용 예시

1. **레시피 링크 입력:** 홈 화면에서 내가 요리하고 싶은 YouTube 영상이나 블로그의 URL을 입력창에 붙여넣고 분석 버튼을 누릅니다.
2. **요리 모드 실행:** AI가 분석하여 깔끔하게 정리해준 레시피(재료 목록 및 조리법)를 확인하고, **[요리 시작]** 버튼을 눌러 조리 몰입형 화면으로 진입합니다.
3. **나만의 기록 남기기:** 요리를 마친 후, 결과물 사진과 함께 이번 요리에서 아쉬웠던 점이나 가족의 반응 등을 간략히 메모해 저장합니다.
