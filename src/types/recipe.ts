export interface DraftIngredient {
  name: string;
  amount?: number | string | null;
  unit?: string | null;
}

export interface DraftStep {
  step_order: number;
  instruction: string;
  timer_seconds?: number | null;
  step_image_url?: string | null;
  step_ingredients?: DraftIngredient[];
}

export interface StepIngredientInfo {
  name: string;
  amount?: number | null;
  unit?: string | null;
}

export interface CookingStep {
  step_order: number;
  instruction: string;
  timer_seconds?: number | null;
  step_ingredients?: StepIngredientInfo[];
}

export interface RecipeIngredient {
  ri_id: number;
  name: string;
  amount: number | null;
  unit: string | null;
}
