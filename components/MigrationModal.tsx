import React, { useState } from 'react';
import { vaultService as oldVaultService } from '../services/secureVault';
import { fileVaultService } from '../services/fileVault';
import { OldVaultEntry, VaultContent } from '../types';

interface MigrationModalProps {
    onMigrationComplete: () => void;
}

export const MigrationModal: React.FC<MigrationModalProps> = ({ onMigrationComplete }) => {
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [status, setStatus] = useState('');

    const handleMigrate = async () => {
        if (!password) return;
        setIsLoading(true);
        setError('');
        setStatus('Unlocking old vault...');
        try {
            const oldKey = await oldVaultService.unlockVault(password);
            if (!oldKey) {
                setError('Invalid password for old vault.');
                setIsLoading(false);
                setStatus('');
                return;
            }

            setStatus('Reading old entries...');
            const oldEntries: OldVaultEntry[] = await oldVaultService.getAllEntries(oldKey);

            setStatus('Creating new secure vault file...');
            const newEntries = oldEntries.map(e => ({
                id: crypto.randomUUID(),
                title: e.title,
                username: e.username,
                password: e.password,
                url: e.url,
                notes: e.notes
            }));
            const newVaultContent: VaultContent = { entries: newEntries };
            
            // Re-uses the same password for the new vault. This is a reasonable UX.
            await fileVaultService.createVault(password, newVaultContent);

            setStatus('Migration successful! Cleaning up...');
            
            await new Promise<void>((resolve, reject) => {
                const req = indexedDB.deleteDatabase('PassmanVault');
                req.onsuccess = () => resolve();
                req.onerror = () => reject(req.error);
                req.onblocked = () => {
                    console.warn('Old vault deletion blocked.');
                    resolve(); // Continue anyway
                };
            });
            
            setStatus('Complete!');
            setTimeout(onMigrationComplete, 1500);

        } catch (e) {
            console.error(e);
            setError('An error occurred during migration.');
            setIsLoading(false);
            setStatus('');
        }
    };

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
            <div className="bg-slate-900/80 border border-cyan-500/50 rounded-lg p-8 w-full max-w-md text-center neon-glow-box">
                <h2 className="text-2xl font-orbitron text-cyan-300 neon-glow-text mb-4">Vault Migration</h2>
                <p className="text-gray-300 mb-6">
                    Passman has a new, more secure file format. Please enter your master password to migrate your existing vault.
                </p>
                <div className="relative mb-4">
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Master Password"
                        className="w-full px-4 py-3 text-lg text-white bg-slate-800/50 border-2 border-slate-600 rounded-lg focus:outline-none focus:border-cyan-400"
                        autoFocus
                    />
                </div>
                {error && <p className="text-red-400 mb-4">{error}</p>}
                {status && !error && <p className="text-cyan-400 mb-4">{status}</p>}
                <button
                    onClick={handleMigrate}
                    disabled={isLoading || !password}
                    className="w-full px-8 py-4 text-xl font-bold font-orbitron text-white bg-cyan-600/80 border-2 border-cyan-500 rounded-lg transition-all duration-300 disabled:opacity-50"
                >
                    {isLoading ? 'Migrating...' : 'Migrate Vault'}
                </button>
            </div>
        </div>
    );
};
