'use client';

import { useQuery } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';

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
  const { data: session } = useSession();
  const userId = session?.user?.email;

  return useQuery<RecipesResponse>({
    queryKey: ['my-recipes', userId],
    queryFn: async () => {
      const res = await fetch('/api/recipes', { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to fetch recipes');
      return res.json();
    },
    enabled: !!userId,
  });
}
