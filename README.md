# Accio Recipe

**조리 UX 최적화를 제공하는 AI 보조 셰프 웹 서비스**

> 젖은 손, 모호한 계량, 휘발되는 요리 경험 — 레시피를 보며 요리할 때 겪는 세 가지 불편함을 줄이기 위해 설계했습니다.

- [데모 영상 (YouTube)](https://youtu.be/P2oGN_nVM5A)
- [프로젝트 기술서](https://docs.google.com/presentation/d/1tTRx71hPjinmTaGuUUngx9bD5KOZBxJqR-tR3ID9r5o/edit?usp=sharing)
- [Figma UX Flow](https://www.figma.com/design/nPPIQOcKdHzprBapnGhR9W/ACCIO-RECIPE-UX-Flow?node-id=0-1&t=4YM5X14xAnDTJo1I-1)

> ⚠️ **현재 운영 상태**
> AWS 프리티어 비용 이슈로 서비스는 일시 중지된 상태입니다. 동작 흐름은 위 **데모 영상**으로 보존했으며, 직접 확인하지 못하는 한계를 고려해 README에 의사결정 맥락과 트러블슈팅을 상세히 기록했습니다.

---

## 🎬 데모

[![Accio Recipe Demo](https://img.youtube.com/vi/P2oGN_nVM5A/maxresdefault.jpg)](https://youtube.com/watch?v=VIDEO_ID)

> 위 이미지를 클릭하면 YouTube 데모 영상으로 이동합니다.

---

## 📌 서비스 소개

### 한 줄 요약

**유튜브/블로그 레시피 URL → 구조화된 JSON → 조리 몰입형 UI**로 변환해, 요리에만 집중할 수 있게 돕는 AI 보조 셰프입니다.

### 어떤 문제를 해결하는가

| Pain Point           | 사용자 경험                                               | 본 서비스의 해결 방식                                    |
| :------------------- | :-------------------------------------------------------- | :------------------------------------------------------- |
| **조리 흐름의 끊김** | 젖은 손으로 화면을 스크롤·터치해야 함                     | Wake Lock + 단계별 자동 진행 UI로 화면 조작 최소화       |
| **정보의 불일치**    | "적당히", "한 컵" 같은 모호한 계량과 인분 환산의 번거로움 | LLM이 비정형 레시피를 구조화된 JSON으로 정규화           |
| **요리 경험의 휘발** | "지난번엔 어떻게 했더라?"라는 반복되는 시행착오           | 경험·보완점·함께한 사람을 기록해 '나의 요리 서재'에 축적 |

### 누구를 위한 서비스인가

- 영상·블로그 레시피를 즐겨 보지만, 조리 중 화면 조작이 불편한 사용자
- 같은 레시피를 여러 번 만들며 자신만의 노하우를 쌓고 싶은 사용자

---

## ✨ 주요 기능

|  #  | 기능                             | 설명                                                                                             |
| :-: | :------------------------------- | :----------------------------------------------------------------------------------------------- |
|  1  | **LLM 기반 레시피 분석 및 추출** | YouTube 영상, 블로그 글 등의 외부 링크에서 핵심 레시피 정보(식재료, 조리 순서 등)를 자동 추출    |
|  2  | **조리 몰입형 UI/UX**            | 요리 중 젖은 손으로도 화면 조작을 최소화할 수 있도록 설계된 최적화된 화면 인터페이스를 제공      |
|  3  | **요리 경험 기록**               | 요리 시의 실패 기록, 맛에 대한 평가, 지인의 반응 등을 저장하여 나만의 레시피 데이터베이스로 활용 |

### 각 기능 스크린샷

#### 1. LLM 기반 레시피 분석 및 추출

<img width="2940" height="1542" alt="01-landing" src="https://github.com/user-attachments/assets/f3316750-91d8-4de5-970b-29ec1cfb1666" />

#### 2. 조리 몰입형 UI/UX

<img width="2940" height="1542" alt="10-cooking-mode" src="https://github.com/user-attachments/assets/91c25c39-05b9-4a4d-9473-b030113fb4ad" />

#### 3. 요리 경험 기록

<img width="2940" height="1542" alt="13-cooking-log" src="https://github.com/user-attachments/assets/65dec9c1-2c81-4e80-8c9d-46eb63b088ff" />

---

## 🛠 기술 스택

| 카테고리              | 기술                                          |
| :-------------------- | :-------------------------------------------- |
| **Frontend Core**     | Next.js 16 (App Router), React 19, TypeScript |
| **Styling & UI**      | Tailwind CSS v4, shadcn/ui                    |
| **State & Data**      | Zustand, TanStack Query                       |
| **Form & Validation** | React Hook Form, Zod                          |
| **Backend**           | Next.js API Routes, Prisma ORM, NextAuth.js   |
| **Database**          | AWS RDS (MySQL)                               |
| **AI**                | Google GenAI — Gemini 3.1 Flash-Lite          |
| **DevOps**            | AWS EC2, Cloudflare (DNS/HTTPS), Nginx, PM2   |
| **Quality & CI**      | GitHub Actions, Vitest, CodeRabbit            |

### 주요 기술 선택 이유

- **Next.js 16 App Router** — Server Component로 초기 로딩 최적화, 동일 프로젝트 안에서 API Routes로 풀스택 구성이 가능해 단독 배포 단위가 늘어나지 않음.
- **Zustand** — 다중 타이머·조리 단계 상태처럼 컴포넌트 트리를 가로지르는 상태가 많지만, Redux 수준의 보일러플레이트가 불필요해 선택.
- **TanStack Query** — 서버 상태와 클라이언트 상태를 분리해 캐싱·낙관적 업데이트를 선언적으로 처리.
- **Gemini 3.1 Flash-Lite** — Structured Output(JSON Schema)을 안정적으로 지원하면서 응답 속도와 비용 균형이 가장 적합.

---

## 🏗 시스템 아키텍처

<img width="1708" height="749" alt="accio-recipe_시스템아키텍처" src="https://github.com/user-attachments/assets/c450c2c4-af00-4873-bbec-e48a4e3604bf" />

### 핵심 흐름

- Cloudflare와 Nginx를 거쳐 EC2 환경에서 운영되는 Next.js 기반 풀스택 웹 애플리케이션의 시스템 아키텍처
- Next.js App Router 중심의 프론트엔드 구조(TailwindCSS, Shadcn UI, Zod, React Hook Form, Zustand, React Query)
- NextAuth·Prisma 기반 서버 로직
- AWS RDS(MySQL) 데이터 계층
- LLM API 연동
- GitHub Actions 기반 CI/CD 파이프라인

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

## 🤝 개발 환경 및 협업

| 항목                  | 내용                                                        |
| :-------------------- | :---------------------------------------------------------- |
| **Branch 전략**       | Git Flow (main / develop / feature/\*)                      |
| **Commit Convention** | Conventional Commits (`feat`, `fix`, `refactor`, `docs` 등) |
| **PR Template**       | 변경 사항 / 의도 / 테스트 방법 / 스크린샷 섹션 강제         |
| **Code Review**       | CodeRabbit AI 자동 리뷰 + 셀프 리뷰 체크리스트              |
| **CI**                | GitHub Actions — `lint` → `type-check` → `test` 순차 실행   |
| **테스트 전략**       | Vitest로 유틸/스키마 단위 테스트 + 시나리오 기반 수동 QA    |

### CI 파이프라인 상세

```yaml
# .github/workflows/ci.yml (요약)
on: [pull_request]
jobs:
  quality:
    steps:
      - ESLint
      - tsc --noEmit
      - vitest run
```

PR이 올라오면 위 작업이 자동 실행되어, 실패 시 머지가 차단되도록 구성.

---

## 🚀 사용 예시

1. **레시피 링크 입력:** 홈 화면에서 내가 요리하고 싶은 YouTube 영상이나 블로그의 URL을 입력창에 붙여넣고 분석 버튼을 누릅니다.
2. **요리 모드 실행:** AI가 분석하여 깔끔하게 정리해준 레시피(재료 목록 및 조리법)를 확인하고, **[요리 시작]** 버튼을 눌러 조리 몰입형 화면으로 진입합니다.
3. **나만의 기록 남기기:** 요리를 마친 후, 결과물 사진과 함께 이번 요리에서 아쉬웠던 점이나 가족의 반응 등을 간략히 메모해 저장합니다.

---
