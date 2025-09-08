import React, { useState, useEffect, useCallback } from 'react';
import { VaultEntry } from '../types';
import { checkPasswordStrength } from '../services/crypto';
import { EyeIcon, EyeOffIcon, RefreshCwIcon } from './Icons';

interface AddEditModalProps {
  entry: VaultEntry | null;
  onClose: () => void;
  onSave: (entry: VaultEntry) => Promise<void>;
}

// Helper component for password strength, defined outside the main component
const PasswordStrengthMeter: React.FC<{ password?: string }> = ({ password = '' }) => {
  const { score } = checkPasswordStrength(password);
  const color = score > 80 ? 'bg-green-500' : score > 50 ? 'bg-yellow-500' : 'bg-red-500';
  const glow = score > 80 ? 'shadow-green-500/50' : score > 50 ? 'shadow-yellow-500/50' : 'shadow-red-500/50';

  return (
    <div className="w-full bg-slate-700 rounded-full h-2 mt-2">
      <div
        className={`h-2 rounded-full transition-all duration-300 ${color} ${glow}`}
        style={{ width: `${score}%`, boxShadow: `0 0 8px var(--tw-shadow-color)` }}
      ></div>
    </div>
  );
};


export const AddEditModal: React.FC<AddEditModalProps> = ({ entry, onClose, onSave }) => {
  const [formData, setFormData] = useState<Partial<VaultEntry>>({
    title: '', username: '', password: '', url: '', notes: '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (entry) {
      setFormData(entry);
    } else {
       setFormData({ title: '', username: '', password: '', url: '', notes: '' });
    }
  }, [entry]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    await onSave(formData as VaultEntry);
    setIsSaving(false);
  };

  const generatePassword = useCallback(() => {
    const lowerChars = 'abcdefghijklmnopqrstuvwxyz';
    const upperChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numberChars = '0123456789';
    const symbolChars = '!@#$%^&*()_+-=[]{}|;:,.<>?';
    const allChars = lowerChars + upperChars + numberChars + symbolChars;
    
    const passwordLength = 20;

    const getRandomChar = (chars: string) => {
        const array = new Uint32Array(1);
        window.crypto.getRandomValues(array);
        return chars[array[0] % chars.length];
    }

    // Guarantee at least one of each character type
    let passwordChars = [
        getRandomChar(lowerChars),
        getRandomChar(upperChars),
        getRandomChar(numberChars),
        getRandomChar(symbolChars),
    ];

    // Fill the rest of the password length
    for (let i = passwordChars.length; i < passwordLength; i++) {
        passwordChars.push(getRandomChar(allChars));
    }
    
    // Shuffle the array to ensure randomness (Fisher-Yates algorithm)
    for (let i = passwordChars.length - 1; i > 0; i--) {
        const array = new Uint32Array(1);
        window.crypto.getRandomValues(array);
        const j = array[0] % (i + 1);
        [passwordChars[i], passwordChars[j]] = [passwordChars[j], passwordChars[i]];
    }
    
    const newPassword = passwordChars.join('');
    setFormData(prev => ({ ...prev, password: newPassword }));
  }, []);

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-slate-900/80 border border-cyan-500/50 rounded-lg p-8 w-full max-w-lg max-h-[90vh] overflow-y-auto scrollbar-hide neon-glow-box" onClick={e => e.stopPropagation()}>
        <h2 className="text-2xl font-orbitron text-cyan-300 neon-glow-text mb-6">{entry ? 'Edit Entry' : 'Add New Entry'}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Title</label>
            <input type="text" name="title" value={formData.title} onChange={handleChange} required className="w-full bg-slate-800 border border-slate-600 rounded-md px-3 py-2 focus:outline-none focus:border-cyan-400 transition-colors" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Username</label>
            <input type="text" name="username" value={formData.username} onChange={handleChange} required className="w-full bg-slate-800 border border-slate-600 rounded-md px-3 py-2 focus:outline-none focus:border-cyan-400 transition-colors" />
          </div>
           <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">URL</label>
            <input type="text" name="url" value={formData.url} onChange={handleChange} className="w-full bg-slate-800 border border-slate-600 rounded-md px-3 py-2 focus:outline-none focus:border-cyan-400 transition-colors" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Password</label>
            <div className="relative">
              <input type={showPassword ? 'text' : 'password'} name="password" value={formData.password} onChange={handleChange} required className="w-full bg-slate-800 border border-slate-600 rounded-md px-3 py-2 focus:outline-none focus:border-cyan-400 transition-colors" />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-10 flex items-center px-2 text-gray-400 hover:text-cyan-400" aria-label={showPassword ? 'Hide password' : 'Show password'}>
                {showPassword ? <EyeOffIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
              </button>
              <button type="button" onClick={generatePassword} className="absolute inset-y-0 right-0 flex items-center px-2 text-gray-400 hover:text-cyan-400" aria-label="Generate new password">
                <RefreshCwIcon className="h-5 w-5"/>
              </button>
            </div>
            <PasswordStrengthMeter password={formData.password} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Notes</label>
            <textarea name="notes" value={formData.notes} onChange={handleChange} rows={3} className="w-full bg-slate-800 border border-slate-600 rounded-md px-3 py-2 focus:outline-none focus:border-cyan-400 transition-colors"></textarea>
          </div>
          <div className="flex justify-end space-x-4 pt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-md text-gray-300 bg-slate-700 hover:bg-slate-600 transition-colors">Cancel</button>
            <button type="submit" disabled={isSaving} className="px-6 py-2 rounded-md font-semibold text-white bg-cyan-600 hover:bg-cyan-500 transition-all duration-300 neon-glow-box-hover border border-cyan-500 disabled:opacity-50">
                {isSaving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
