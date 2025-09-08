// FIX: Import `useEffect` from `react` to resolve `Cannot find name 'useEffect'` error.
import { useState, useCallback, useRef, useEffect } from 'react';

type CopyFn = (text: string, timeout?: number) => Promise<boolean>;

export function useCopyToClipboard(): [boolean, CopyFn] {
  const [isCopied, setIsCopied] = useState(false);
  const copyTimeoutRef = useRef<number | null>(null);

  const clearClipboard = useCallback(() => {
    // Cannot truly clear, but can replace with a non-sensitive value
    navigator.clipboard.writeText(' ').catch(err => console.warn('Could not clear clipboard', err));
  }, []);

  const copy: CopyFn = useCallback(async (text, timeout = 30000) => {
    if (!navigator?.clipboard) {
      console.warn('Clipboard not supported');
      return false;
    }

    if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
    }

    try {
      await navigator.clipboard.writeText(text);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000); // UI feedback reset

      copyTimeoutRef.current = window.setTimeout(() => {
        clearClipboard();
        copyTimeoutRef.current = null;
      }, timeout);
      
      return true;
    } catch (error) {
      console.warn('Copy failed', error);
      setIsCopied(false);
      return false;
    }
  }, [clearClipboard]);
  
  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }
    };
  }, []);

  return [isCopied, copy];
}