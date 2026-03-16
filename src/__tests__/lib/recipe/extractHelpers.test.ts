import { expect, test, describe, vi, beforeEach } from 'vitest';
import { withRetry, processExtraction } from '@/lib/recipe/extractHelpers';
import prisma from '@/lib/prisma';
import { SSEWriter } from '@/lib/recipe/sse';

vi.mock('@/lib/prisma', () => ({
  default: {
    recipes: {
      update: vi.fn(),
      delete: vi.fn(),
    },
    $transaction: vi.fn((cb) => cb(prisma)),
    recipe_ingredients: {
      createMany: vi.fn(),
    },
    recipe_steps: {
      createMany: vi.fn(),
    },
  },
}));

vi.mock('@google/genai', () => {
  const mockGenerateContent = vi.fn();
  return {
    GoogleGenAI: vi.fn().mockImplementation(() => ({
      models: {
        generateContent: mockGenerateContent,
      },
    })),
    Type: {
      OBJECT: 'object',
      STRING: 'string',
      INTEGER: 'integer',
      ARRAY: 'array',
      NUMBER: 'number',
    },
    _mockGenerateContent: mockGenerateContent,
  };
});

describe('extractHelpers - withRetry AbortSignal support', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('should propagate success', async () => {
    const fn = vi.fn().mockResolvedValue('success');
    const result = await withRetry(fn);
    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  test('should fail after max retries', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('fail'));
    // 1st attempt fail -> backoff -> 2nd attempt fail -> throw
    await expect(withRetry(fn, 2)).rejects.toThrow('fail');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  test('should stop when aborted before attempt', async () => {
    const controller = new AbortController();
    controller.abort();
    const fn = vi.fn().mockResolvedValue('success');

    await expect(withRetry(fn, 3, 'API', controller.signal)).rejects.toThrow('Aborted');
    expect(fn).not.toHaveBeenCalled();
  });

  test('should stop when aborted during backoff', async () => {
    const controller = new AbortController();
    const fn = vi.fn().mockRejectedValueOnce(new Error('fail')).mockResolvedValue('success');

    // Start withRetry
    const promise = withRetry(fn, 3, 'API', controller.signal);

    // Minor delay to let the first call fail and start the backoff
    await new Promise((res) => setTimeout(res, 50));

    expect(fn).toHaveBeenCalledTimes(1);

    // Abort
    controller.abort();

    await expect(promise).rejects.toThrow('Aborted');
    // If it aborted during backoff, it should NOT have been called a second time
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

describe('extractHelpers - processExtraction AbortSignal support', () => {
  const mockSSE = {
    write: vi.fn(),
    close: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.GEMINI_API_KEY = 'test-key';
  });

  test('should stop execution and cleanup when signal is aborted before Gemini call', async () => {
    const controller = new AbortController();
    controller.abort();

    await processExtraction(1, [], 'Fallback', mockSSE as unknown as SSEWriter, controller.signal);

    expect(prisma.recipes.delete).toHaveBeenCalledWith({ where: { recipe_id: 1 } });
  });
});
