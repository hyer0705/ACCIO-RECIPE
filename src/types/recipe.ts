export interface CookingStep {
  step_order: number;
  instruction: string;
  timer_seconds?: number | null;
  step_ingredients?: unknown; // JSON array of ingredient names for this step
}

export interface RecipeIngredient {
  ri_id: number;
  name: string;
  amount: number | null;
  unit: string | null;
}
