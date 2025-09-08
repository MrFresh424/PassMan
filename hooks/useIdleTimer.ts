import { useEffect, useRef, useCallback } from 'react';

export function useIdleTimer(onIdle: () => void, idleTimeout: number = 5 * 60 * 1000) {
    const timeoutId = useRef<number | null>(null);

    const resetTimer = useCallback(() => {
        if (timeoutId.current) {
            window.clearTimeout(timeoutId.current);
        }
        timeoutId.current = window.setTimeout(onIdle, idleTimeout);
    }, [onIdle, idleTimeout]);

    const handleEvent = useCallback(() => {
        resetTimer();
    }, [resetTimer]);

    useEffect(() => {
        const events = ['mousemove', 'keydown', 'mousedown', 'touchstart', 'scroll'];
        
        // Initial setup
        resetTimer();

        events.forEach(event => window.addEventListener(event, handleEvent));

        return () => {
            if (timeoutId.current) {
                window.clearTimeout(timeoutId.current);
            }
            events.forEach(event => window.removeEventListener(event, handleEvent));
        };
    }, [handleEvent, resetTimer]);

    return { resetTimer };
}
