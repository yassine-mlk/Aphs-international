import { useState, useCallback, useRef } from 'react';

/**
 * Hook to prevent double-submit on async actions.
 * Wraps any async function to track loading state and prevent concurrent executions.
 * 
 * Usage:
 *   const [handleSave, isSaving] = useAsyncAction(async () => { ... });
 *   <Button onClick={handleSave} disabled={isSaving}>
 *     {isSaving ? 'Sauvegarde...' : 'Sauvegarder'}
 *   </Button>
 */
export function useAsyncAction<T extends (...args: any[]) => Promise<any>>(
  action: T
): [(...args: Parameters<T>) => Promise<ReturnType<T> | undefined>, boolean] {
  const [isRunning, setIsRunning] = useState(false);
  const lockRef = useRef(false);

  const wrappedAction = useCallback(
    async (...args: Parameters<T>): Promise<ReturnType<T> | undefined> => {
      // Prevent double-submit with ref (sync check) + state (UI)
      if (lockRef.current) return undefined;
      lockRef.current = true;
      setIsRunning(true);

      try {
        const result = await action(...args);
        return result;
      } finally {
        lockRef.current = false;
        setIsRunning(false);
      }
    },
    [action]
  );

  return [wrappedAction, isRunning];
}
