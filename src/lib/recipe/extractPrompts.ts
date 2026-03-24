import { Type, Schema } from '@google/genai';

// ── 공통 프롬프트 ──────────────────────────────────────────────────────────────
export const SYSTEM_PROMPT = `너는 최고의 요리 전문가이자 레시피 구조화 AI야. 주어진 동영상이나 텍스트를 보고 오직 '요리 레시피'와 관련된 필수 정보(제목, 난이도, 몇인분, 재료, 스텝)만 정확하게 추출해야 해.

**[핵심 규칙 1: 조리 순서 텍스트 안에는 재료의 계량 수치(무게/부피) 금지, 단 시간과 온도는 무조건 보존]**
조리 순서(instruction) 텍스트 안에 절대 구체적인 재료 무게/부피 계량 수치(예: 370g, 200ml, 1큰술 등의 숫자+단위)를 적지 마라.
- BAD 예시: "크림치즈 370g을 볼에 넣고 부드럽게 풀어준다."
- GOOD 예시: "계량한 크림치즈를 볼에 넣고 부드럽게 풀어준다."
하지만 조리에 필요한 "시간(분, 시간, 초)"이나 "온도(도)"와 관련된 안내(예: "220도로 22분동안 구워주세요", "15분간 불려주세요")는 절대로 삭제하지 말고 원본 텍스트 그대로 보존해라.

**[핵심 규칙 2: 각 조리 단계별 사용되는 재료 안내(step_ingredients) 추출]**
각 조리 단계(step)마다 해당 단계에서 실제로 투입되거나 사용되는 재료들의 상세 정보(이름, 양, 단위)를 객체 배열 형식으로 명시해라.
이름은 반드시 전체 ingredients 목록에 존재하는 name 값과 동일해야 한다.
- 예시: "크림치즈와 설탕을 섞는" 단계라면 step_ingredients: [{"name": "크림치즈", "amount": 400, "unit": "g"}, {"name": "설탕", "amount": 100, "unit": "g"}]

**[핵심 규칙 3: 재료 계량 정확도]**
재료의 계량(숫자, 단위)은 영상의 음성이나 자막에서 언급된 텍스트를 100% 최우선으로 따르며, 임의로 수치를 추정하거나 변경하지 마라.

결과는 반드시 정해진 JSON 스키마에 맞추어서 반환해라.`;

// ── 공통 JSON 스키마(Gemini용) ────────────────────────────────────────────────
export const GEMINI_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    title: {
      type: Type.STRING,
      description: '요리 또는 레시피의 제목. 명확하지 않으면 적절히 생성.',
    },
    difficulty: {
      type: Type.STRING,
      enum: ['Easy', 'Medium', 'Hard'],
      description: '요리 난이도',
    },
    servings: { type: Type.INTEGER, description: '레시피 기준 인원 수' },
    ingredients: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING, description: '재료 이름' },
          amount: { type: Type.NUMBER, description: '재료 양 (숫자. 없으면 생략)', nullable: true },
          unit: { type: Type.STRING, description: '재료 단위', nullable: true },
        },
        required: ['name'],
      },
    },
    steps: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          step_order: { type: Type.INTEGER, description: '조리 순서 (1, 2, 3...)' },
          instruction: {
            type: Type.STRING,
            description:
              '조리 지시사항. 재료의 무게/부피 계량 수치(예: 300g, 1큰술)는 명시하지 마라. 단, 조리 시간(N분)이나 온도(N도) 관련 텍스트는 무조건 보존할 것.',
          },
          timer_seconds: {
            type: Type.INTEGER,
            description: '대기 시간이 필요한 경우 초 단위 분량 (보통 0)',
          },
          step_ingredients: {
            type: Type.ARRAY,
            description:
              '이 단계에서 사용되는 재료들의 상세 정보 객체 배열. 이름(name)은 ingredients 목록의 name과 정확히 일치해야 함.',
            items: {
              type: Type.OBJECT,
              properties: {
                step_order: { type: Type.INTEGER, description: '조리 순서 (1, 2, 3...)' },
                name: { type: Type.STRING, description: '재료 이름' },
                amount: { type: Type.NUMBER, description: '재료 양', nullable: true },
                unit: { type: Type.STRING, description: '재료 단위', nullable: true },
              },
              required: ['step_order', 'name'],
            },
          },
        },
        required: ['step_order', 'instruction'],
      },
    },
  },
  required: ['title', 'difficulty', 'servings', 'ingredients', 'steps'],
};
