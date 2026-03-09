'use client';

import { useQuery } from '@tanstack/react-query';

export interface Recipe {
  recipe_id: number;
  title: string;
  thumbnail_url: string | null;
  difficulty: string | null;
  servings: number | null;
  created_at: string;
}

export interface RecipesResponse {
  success: boolean;
  data: Recipe[];
}

export function useMyRecipes() {
  return useQuery<RecipesResponse>({
    queryKey: ['my-recipes'],
    queryFn: async () => {
      const res = await fetch('/api/recipes', { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to fetch recipes');
      return res.json();
    },
  });
}
