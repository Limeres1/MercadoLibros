import { useCallback, useState } from 'react';

import { AI_CLIENT_ERRORS, AIError, AIRequest, askAI } from '@/services/ai';

export function useAI() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ask = useCallback(async (request: AIRequest): Promise<string | null> => {
    setIsLoading(true);
    setError(null);
    try {
      return await askAI(request);
    } catch (caught) {
      setError(caught instanceof AIError ? caught.message : AI_CLIENT_ERRORS.unknown);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const resetError = useCallback(() => setError(null), []);

  return { ask, isLoading, error, resetError };
}
