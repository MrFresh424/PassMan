import React from 'react';
import { TrashIcon } from './Icons';

interface ConfirmModalProps {
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({ onClose, onConfirm, title, message }) => {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-slate-900/80 border border-red-500/50 rounded-lg p-8 w-full max-w-md text-center neon-glow-box" onClick={e => e.stopPropagation()}>
        <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-900/50 border-2 border-red-500/70 mb-4">
            <TrashIcon className="h-8 w-8 text-red-300" />
        </div>
        <h2 className="text-2xl font-orbitron text-red-300 neon-glow-text mb-4">{title}</h2>
        <p className="text-gray-300 mb-8">{message}</p>
        <div className="flex justify-center space-x-4">
            <button
                type="button"
                onClick={onClose}
                className="px-6 py-2 rounded-md font-semibold text-gray-300 bg-slate-700 hover:bg-slate-600 transition-colors"
            >
                Cancel
            </button>
            <button
                type="button"
                onClick={onConfirm}
                className="px-6 py-2 rounded-md font-semibold text-white bg-red-600 hover:bg-red-500 transition-all duration-300 neon-glow-box-hover border border-red-500"
            >
                Confirm Delete
            </button>
        </div>
      </div>
    </div>
  );
};
