import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';

interface DeleteRecipeResponse {
  success: boolean;
  message?: string;
}

export function useDeleteRecipe() {
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const userId = session?.user?.email;

  return useMutation<DeleteRecipeResponse, Error, number>({
    mutationFn: async (recipeId: number) => {
      const response = await fetch(`/api/recipes/${recipeId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '레시피 삭제에 실패했습니다.');
      }
      return response.json();
    },
    onSuccess: () => {
      // Invalidate the 'my-recipes' and 'dashboard' query with userId
      queryClient.invalidateQueries({ queryKey: ['my-recipes', userId] });
      queryClient.invalidateQueries({ queryKey: ['dashboard', userId] });
    },
  });
}
