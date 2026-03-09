import { useMutation, useQueryClient } from '@tanstack/react-query';

interface DeleteRecipeResponse {
  success: boolean;
  message?: string;
}

export function useDeleteRecipe() {
  const queryClient = useQueryClient();

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
      // Invalidate the 'my-recipes' query to refetch the list
      queryClient.invalidateQueries({ queryKey: ['my-recipes'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] }); // update dashboard count depending on requirement
    },
  });
}
