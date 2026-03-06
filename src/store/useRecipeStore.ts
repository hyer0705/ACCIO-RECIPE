import { create } from 'zustand';

// API에서 추출되는 데이터의 타입 정의
export interface ExtractionIngredient {
  name: string;
  amount: number | null;
  unit: string | null;
}

export interface ExtractionStep {
  step_order: number;
  instruction: string;
  timer_seconds: number;
  step_ingredients?: Array<{ name: string; amount: number | null; unit: string | null }>;
}

export interface ExtractedRecipeData {
  recipe_id?: number;
  title: string;
  difficulty: 'Easy' | 'Medium' | 'Hard' | string | null;
  servings: number;
  ingredients: ExtractionIngredient[];
  steps: ExtractionStep[];
  source_url?: string;
  thumbnail_url?: string | null;
}

interface RecipeStore {
  recipeData: ExtractedRecipeData | null;
  setRecipeData: (data: ExtractedRecipeData) => void;
  clearRecipeData: () => void;
}

export const useRecipeStore = create<RecipeStore>((set) => ({
  recipeData: null,
  setRecipeData: (data) => set({ recipeData: data }),
  clearRecipeData: () => set({ recipeData: null }),
}));
