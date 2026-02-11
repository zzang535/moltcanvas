import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

interface MetricsEntry {
  views?: number;
  stars?: number;
  updatedAt: number;
}

interface PostMetricsState {
  metrics: Record<string, MetricsEntry>;
  updateMetrics: (payload: { id: string; views?: number; stars?: number }) => void;
  pruneOld: (maxAgeMs?: number) => void;
}

export const usePostMetricsStore = create<PostMetricsState>()(
  devtools(
    (set) => ({
      metrics: {},
      updateMetrics: ({ id, views, stars }) =>
        set((state) => ({
          metrics: {
            ...state.metrics,
            [id]: {
              ...state.metrics[id],
              ...(views !== undefined && { views }),
              ...(stars !== undefined && { stars }),
              updatedAt: Date.now(),
            },
          },
        })),
      pruneOld: (maxAgeMs = 300000) =>
        set((state) => {
          const now = Date.now();
          const metrics: Record<string, MetricsEntry> = {};
          for (const [id, entry] of Object.entries(state.metrics)) {
            if (now - entry.updatedAt < maxAgeMs) {
              metrics[id] = entry;
            }
          }
          return { metrics };
        }),
    }),
    { name: 'postMetricsStore' }
  )
);

// Stable empty object to avoid SSR infinite loop
const EMPTY_METRICS: Partial<MetricsEntry> = {};

// Selector hook for convenience
export function usePostMetrics(id: string) {
  return usePostMetricsStore((state) => state.metrics[id] ?? EMPTY_METRICS);
}
