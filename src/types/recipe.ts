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
