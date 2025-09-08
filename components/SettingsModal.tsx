import React, { useState } from 'react';
import { VaultHeader, VaultContent } from '../types';

interface SettingsModalProps {
    onClose: () => void;
    settings: any;
    onSettingsChange: (newSettings: any) => void;
    vaultHeader: VaultHeader;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ onClose, settings, onSettingsChange, vaultHeader }) => {
    const [localSettings, setLocalSettings] = useState(settings);

    const handleSave = () => {
        localStorage.setItem('passman_settings', JSON.stringify(localSettings));
        onSettingsChange(localSettings);
        onClose();
    };
    
    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-slate-900/80 border border-cyan-500/50 rounded-lg p-8 w-full max-w-lg max-h-[90vh] overflow-y-auto scrollbar-hide neon-glow-box" onClick={e => e.stopPropagation()}>
                <h2 className="text-2xl font-orbitron text-cyan-300 neon-glow-text mb-6">Settings</h2>
                <div className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">Auto-lock after inactivity</label>
                        <div className="flex items-center space-x-4">
                            <input type="range" min="1" max="30" value={localSettings.autoLockMinutes} onChange={e => setLocalSettings({...localSettings, autoLockMinutes: parseInt(e.target.value, 10)})} className="w-full" />
                            <span className="text-cyan-300 font-mono w-24 text-right">{localSettings.autoLockMinutes} minute(s)</span>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">Clear clipboard after</label>
                        <div className="flex items-center space-x-4">
                             <input type="range" min="5" max="120" step="5" value={localSettings.clipboardClearSeconds} onChange={e => setLocalSettings({...localSettings, clipboardClearSeconds: parseInt(e.target.value, 10)})} className="w-full" />
                            <span className="text-cyan-300 font-mono w-24 text-right">{localSettings.clipboardClearSeconds} seconds</span>
                        </div>
                    </div>
                    <div className="flex items-center justify-between">
                        <label htmlFor="lockOnBlur" className="text-sm font-medium text-gray-400">Lock vault on window blur</label>
                        <button onClick={() => setLocalSettings({...localSettings, lockOnBlur: !localSettings.lockOnBlur})} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${localSettings.lockOnBlur ? 'bg-cyan-600' : 'bg-slate-600'}`}>
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${localSettings.lockOnBlur ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                    </div>
                    <div className="border-t border-slate-700 pt-4">
                         <h3 className="text-lg font-orbitron text-cyan-400 mb-2">Vault Info</h3>
                         <p className="text-sm text-gray-400">KDF Algorithm: <span className="font-mono text-cyan-300">{vaultHeader.kdf}</span></p>
                         {'iterations' in vaultHeader.kdfParams && <p className="text-sm text-gray-400">Iterations: <span className="font-mono text-cyan-300">{vaultHeader.kdfParams.iterations.toLocaleString()}</span></p>}
                         {'mem' in vaultHeader.kdfParams && <p className="text-sm text-gray-400">Memory: <span className="font-mono text-cyan-300">{vaultHeader.kdfParams.mem / 1024}MB</span></p>}
                         {vaultHeader.kdf === 'pbkdf2' && (
                            <div className="mt-4">
                                <button disabled={true} className="w-full px-4 py-2 rounded-md font-semibold text-white bg-green-600 transition-colors opacity-50 cursor-not-allowed">
                                    Upgrade KDF to Argon2id
                                </button>
                                <p className="text-xs text-gray-500 mt-2">KDF Upgrade requires re-entering your master password. This feature is planned for a future update.</p>
                            </div>
                         )}
                    </div>
                </div>

                <div className="flex justify-end space-x-4 pt-8">
                    <button type="button" onClick={onClose} className="px-4 py-2 rounded-md text-gray-300 bg-slate-700 hover:bg-slate-600 transition-colors">Cancel</button>
                    <button type="button" onClick={handleSave} className="px-6 py-2 rounded-md font-semibold text-white bg-cyan-600 hover:bg-cyan-500 transition-all duration-300 neon-glow-box-hover border border-cyan-500">
                        Save
                    </button>
                </div>
            </div>
        </div>
    );
};
