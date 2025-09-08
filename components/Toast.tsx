import React, { useEffect } from 'react';
import { CheckIcon } from './Icons';

export interface ToastData {
    id: number;
    message: string;
    duration?: number;
}

interface ToastProps {
    toast: ToastData;
    onDismiss: (id: number) => void;
}

const Toast: React.FC<ToastProps> = ({ toast, onDismiss }) => {
    useEffect(() => {
        const timer = setTimeout(() => {
            onDismiss(toast.id);
        }, toast.duration || 4000);

        return () => {
            clearTimeout(timer);
        };
    }, [toast, onDismiss]);

    return (
        <div className="flex items-center bg-slate-800/90 border border-cyan-500/50 rounded-lg p-4 shadow-lg neon-glow-box animate-fade-in-up">
            <CheckIcon className="w-6 h-6 text-cyan-400 mr-3" />
            <p className="text-white">{toast.message}</p>
        </div>
    );
};

export const ToastContainer: React.FC<{toasts: ToastData[], onDismiss: (id: number) => void}> = ({ toasts, onDismiss }) => {
    return (
        <div className="fixed bottom-24 right-8 z-50 space-y-3">
            {toasts.map(toast => (
                <Toast key={toast.id} toast={toast} onDismiss={onDismiss} />
            ))}
        </div>
    );
};
