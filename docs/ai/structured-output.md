# Structured Output 설계

> LLM 응답을 JSON 스키마로 고정하고, Zod 검증과 재시도 로직으로 응답의 안정성을 확보한 방식에 대한 문서입니다.

---

## 1. 문제 인식 — LLM 응답의 비결정성

LLM은 본질적으로 **확률적인 텍스트 생성기**다. 같은 입력에도 매번 다른 응답을 반환할 수 있고, 자연어 응답을 그대로 UI에서 사용하려고 하면 다음 문제가 발생합니다.

- 응답 구조가 매번 달라 프론트엔드에서 안정적인 렌더링 불가
- 필드 누락이 발생해도 런타임에 에러로만 드러남
- 응답 형식이 깨졌을 때 부분적으로 사용할 수 있는 데이터인지 판단 불가

본 프로젝트는 LLM의 응답을 **조리 UI에서 그대로 렌더링하는 구조**이기 때문에, 응답 안정성이 곧 서비스 안정성과 직결됐다. 따라서 다음 두 단계 방어를 설계했습니다.

1. **LLM 호출 단계**: Gemini API의 Structured Output 기능을 통해 응답 형식을 JSON 스키마로 강제
2. **검증 단계**: 응답을 받은 후 Zod로 한 번 더 검증, 실패 시 재시도

---

## 2. JSON 스키마 설계

조리 UI에 필요한 데이터를 역으로 추적해 다음 스키마를 정의했다. `@google/genai` SDK의 `Type` 기반 스키마를 사용했습니다.

```typescript
{
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
}
```

### 주요 설계 결정

**① `difficulty`를 enum으로 제한 (`['Easy', 'Medium', 'Hard']`)**

자유 문자열로 두면 LLM이 "쉬움", "보통", "Easy", "★★☆" 등 매번 다른 표기를 반환할 수 있다. 세 가지 값으로 고정하여 UI 라벨 매핑을 단순화했습니다.

**② `amount`와 `unit`을 `nullable: true`로 허용**

원본 콘텐츠에 계량 정보가 없는 경우(예: "적당량 넣어주세요")를 위해 `null`을 허용했습니다. 이렇게 하지 않으면 LLM이 임의로 수치를 만들어내(hallucination) 잘못된 정보를 제공할 위험이 있습니다.

`description`에도 "없으면 생략"이라는 가이드를 명시해서, LLM이 수치를 무리하게 채우려 하지 않도록 안내했습니다.

**③ `timer_seconds`를 별도 필드로 분리**

조리 지시문 텍스트 안에서 시간 정보를 정규식으로 파싱하는 것보다, LLM이 추출 단계에서 미리 초 단위 정수로 변환해주는 게 안정적입니다. 멀티 타이머 UI가 이 필드를 직접 소비합니다.

**④ `instruction`의 `description`에 프롬프트 규칙 중복 명시**

스키마의 `description` 필드는 LLM이 응답 생성 시 참고하는 가이드 입니다. 시스템 프롬프트에서 이미 핵심 규칙 1로 명시한 "조리 지시문에 계량 수치 금지, 시간/온도는 보존"을 **스키마의 `description`에도 다시 명시**했습니다.

```text
'조리 지시사항. 재료의 무게/부피 계량 수치(예: 300g, 1큰술)는 명시하지 마라.
단, 조리 시간(N분)이나 온도(N도) 관련 텍스트는 무조건 보존할 것.'
```

시스템 프롬프트는 응답 전체의 톤과 추출 기준을 결정하고, 스키마 description은 해당 필드를 생성하는 순간에 LLM이 다시 참조합니다. **두 위치에 동일한 규칙을 배치한 이유는 LLM이 긴 응답을 생성하는 도중에 초기 지시를 잊는 경우에 대비한 이중 안전장치**입니다.

**⑤ `step_ingredients`의 `name`이 `ingredients`의 `name`과 일치**

조리 몰입 UI에서 단계별 재료를 보여줄 때, 전체 재료 목록과의 참조 정합성을 보장하기 위함. 스키마 `description`과 시스템 프롬프트 양쪽에서 명시했습니다.

**⑥ `step_ingredients` 내부에도 `step_order` 포함**

이 필드는 상위 `step`의 `step_order`와 중복된다고 볼 수 있습니다. 그럼에도 별도로 포함시킨 이유는, 향후 `step_ingredients`를 별도 테이블로 정규화하거나 단계 정렬 로직에서 단독으로 사용할 때 **부모 단계 정보 없이도 어느 단계에 속하는지 즉시 식별**할 수 있도록 하기 위함입니다.

### `required` 필드 설계

스키마에서 `required`를 명시한 필드와 생략한 필드의 구분에는 의도가 있습니다.

| 레벨                    | required                                                  | optional                            |
| ----------------------- | --------------------------------------------------------- | ----------------------------------- |
| 최상위                  | `title`, `difficulty`, `servings`, `ingredients`, `steps` | (없음)                              |
| `ingredients` 항목      | `name`                                                    | `amount`, `unit`                    |
| `steps` 항목            | `step_order`, `instruction`                               | `timer_seconds`, `step_ingredients` |
| `step_ingredients` 항목 | `step_order`, `name`                                      | `amount`, `unit`                    |

**원칙**: "이 값이 없으면 UI 렌더링이 깨지는가?"

- 재료 `name`이 없으면 재료 자체가 무의미 → required
- 재료 `amount`/`unit`은 "적당량" 같은 경우가 있을 수 있음 → optional
- 단계 `timer_seconds`는 대기 시간이 없는 단계도 많음 → optional
- 단계 `step_ingredients`는 별도 재료 투입 없이 진행만 하는 단계가 있을 수 있음 → optional

---

## 3. Gemini Structured Output 활용

Gemini API는 `responseSchema`를 통해 응답 형식을 강제하는 기능을 제공합니다. 위 JSON 스키마를 그대로 적용했습니다.

```typescript
const response = await ai.models.generateContent({
  model: 'gemini-3.1-flash-lite',
  contents: [...],
  config: {
    systemInstruction: SYSTEM_PROMPT,
    responseMimeType: 'application/json',
    responseSchema: RECIPE_RESPONSE_SCHEMA,
  },
});
```

이 방식의 효과:

- LLM이 응답 단계에서 스키마를 인지하고 그에 맞춰 생성
- 자연어 설명 등 부수 텍스트가 섞이지 않음
- JSON 파싱 실패 확률이 현저히 낮아짐

다만 **Gemini가 스키마를 100% 준수한다고 보장되지는 않으므로**, 응답을 받은 후에도 별도 검증이 필요합니다.

---

## 4. JSON 파싱 및 에러 처리

Gemini 응답을 받은 직후 `JSON.parse`로 파싱하며, 파싱 실패 시 즉시 에러를 throw합니다.

```typescript
let recipeData;
try {
  recipeData = JSON.parse(llmContent);
} catch (parseError) {
  throw new Error('LLM 응답 형식이 올바르지 않습니다. 다시 시도해주세요.');
}
```

JSON 파싱 자체가 실패한 경우와 이후 데이터 처리 오류를 분리하여 디버깅이 쉽도록 에러 메시지를 구분했습니다.

---

## 5. 재시도 로직 — 최대 3회

LLM 응답이 일시적으로 스키마를 위반하거나 네트워크 이슈로 실패할 수 있습니다. 이 경우 사용자에게 즉시 에러를 반환하기보다, **재시도를 통해 자연스럽게 복구**되도록 설계했습니다.

```typescript
llmContent = await withRetry(() => callGemini(contentsToAnalyze, signal), 3, 'Gemini', signal);

async function withRetry<T>(fn: () => Promise<T>, retries = 3, label = 'API'): Promise<T> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt === retries) throw err;
      const delay = 1000 * 2 ** (attempt - 1); // 1s → 2s → 4s
      await new Promise((res) => setTimeout(res, delay));
    }
  }
}
```

### 재시도 횟수를 3회로 정한 이유

- **너무 적으면** 일시적 네트워크/API 실패를 흡수하지 못하고 사용자에게 에러로 노출됨
- **너무 많으면** LLM 호출 비용이 누적되고, 사용자 대기 시간이 길어짐(이미 평균 19초)
- 3회면 두 번째까지 실패해도 한 번 더 기회를 주는 수준 — 비용과 안정성의 균형점

---

## 6. SSE 진행률 UI와의 연결

위 검증/재시도 로직은 SSE(Server-Sent Events) 진행률의 **3단계 "데이터 정제 및 구조화"** 구간에서 동작합니다.

```
[Step 1] 원본 데이터 수집
[Step 2] AI 엔진 기반 레시피 추출 (Gemini 호출 + 재시도)
[Step 3] 데이터 정제 및 구조화  ← JSON 파싱 + DB 저장
[Step 4] 완료
```

사용자는 Gemini 재시도가 일어나는 동안에도 진행 상태를 인지할 수 있습니다.

---

## 7. 한계 인지

### 현재 한계

- **재시도가 무조건 3회**: 실패 유형(네트워크 에러 vs API 오류)에 관계없이 동일하게 3회 재시도합니다.
- **재시도 시 입력 변화 없음**: 동일한 프롬프트로 재호출. 재시도 시 "이전 응답이 X 이유로 실패했으니 보완해줘" 같은 self-correction 로직은 없습니다.
- **JSON 파싱 실패 시 복구 불가**: JSON 자체가 깨지면 전체를 폐기. 가용한 필드를 살리는 graceful degradation 전략은 미적용.
- **스키마 description의 효과 미측정**: 스키마 description에 가이드를 넣는 것이 응답 품질에 얼마나 기여했는지 A/B 비교한 적이 없습니다.

---

## 관련 문서

- [프롬프트 설계](./prompt-design.md) — JSON 스키마와 연결되는 시스템 프롬프트 설계
- [모델 선정 의사결정](./model-selection.md) — Structured Output을 지원하는 모델 선택 이유
