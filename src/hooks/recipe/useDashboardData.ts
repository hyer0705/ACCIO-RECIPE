'use client';

import { useQuery } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';

interface ExpiringItem {
  item_id: number;
  name: string;
  icon_url: string | null;
  expiry_date: string;
  d_day: number;
}

interface LatestLesson {
  log_id: number;
  recipe_title: string;
  lesson_note: string;
  cooked_at: string;
}

export interface DashboardData {
  monthly_cooking_count: number;
  prev_month_cooking_count: number;
  monthly_success_rate: number | null;
  expiring_items: ExpiringItem[];
  latest_lesson: LatestLesson | null;
  recent_recipes: {
    recipe_id: number;
    title: string;
    thumbnail_url: string | null;
    difficulty: string | null;
    servings: number | null;
    created_at: string;
  }[];
}

export function useDashboardData() {
  const { data: session } = useSession();
  const userId = session?.user?.email;

  return useQuery<DashboardData>({
    queryKey: ['dashboard', userId],
    queryFn: async () => {
      const res = await fetch('/api/dashboard', { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to fetch dashboard data');
      const json = await res.json();
      return json.data;
    },
    enabled: !!userId,
  });
}
