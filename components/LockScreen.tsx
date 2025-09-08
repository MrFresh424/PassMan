import React, { useState, useEffect } from 'react';
import { fileVaultService } from '../services/fileVault';
import { vaultService as oldVaultService } from '../services/secureVault';
import { checkPasswordStrength } from '../services/crypto';
import { VaultContent, VaultHeader } from '../types';
import { LockIcon } from './Icons';
import { MigrationModal } from './MigrationModal';


interface LockScreenProps {
  onUnlock: (key: CryptoKey, content: VaultContent, header: VaultHeader) => void;
}

const PasswordStrengthMeter: React.FC<{ password?: string }> = ({ password = '' }) => {
  const { score, message } = checkPasswordStrength(password);
  const color = score > 80 ? 'bg-green-500' : score > 50 ? 'bg-yellow-500' : 'bg-red-500';
  const glow = score > 80 ? 'shadow-green-500/50' : score > 50 ? 'shadow-yellow-500/50' : 'shadow-red-500/50';

  return (
    <>
      <div className="w-full bg-slate-700 rounded-full h-2 mt-2">
        <div
          className={`h-2 rounded-full transition-all duration-300 ${color} ${glow}`}
          style={{ width: `${score}%`, boxShadow: `0 0 8px var(--tw-shadow-color)` }}
        ></div>
      </div>
      {password && <p className="text-xs text-right mt-1 text-gray-400">{message}</p>}
    </>
  );
};


export const LockScreen: React.FC<LockScreenProps> = ({ onUnlock }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [needsMigration, setNeedsMigration] = useState(false);

  useEffect(() => {
    const checkVault = async () => {
      try {
        const newVaultExists = await fileVaultService.isVaultInitialized();
        if (newVaultExists) {
            setIsInitialized(true);
        } else {
            const oldVaultExists = await oldVaultService.isVaultInitialized();
            if (oldVaultExists) {
                setNeedsMigration(true);
            } else {
                setIsInitialized(false);
            }
        }
      } catch(err) {
        setError("Could not access storage. Check app permissions.");
      } finally {
        setIsChecking(false);
      }
    };
    checkVault();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading || !password) return;

    setIsLoading(true);
    setError('');

    try {
      if (isInitialized) {
        const result = await fileVaultService.unlockVault(password);
        if (result) {
          onUnlock(result.masterKey, result.content, result.header);
        } else {
          setError('Invalid password.');
        }
      } else {
        // Creating a new vault
        const strength = checkPasswordStrength(password);
        if (strength.score < 50) {
            setError(`Password is too weak. ${strength.message}`);
            setIsLoading(false);
            return;
        }
        const initialContent: VaultContent = { entries: [] };
        await fileVaultService.createVault(password, initialContent);
        const result = await fileVaultService.unlockVault(password); // Re-unlock to get all parts
        if (result) {
          onUnlock(result.masterKey, result.content, result.header);
        } else {
          throw new Error("Failed to create and unlock a new vault.");
        }
      }
    } catch (err) {
      console.error(err);
      setError('An unexpected error occurred.');
    } finally {
        setIsLoading(false);
        setPassword('');
    }
  };

  if (isChecking) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-cyan-400">Initializing Secure Environment...</p>
      </div>
    );
  }

  if (needsMigration) {
      return <MigrationModal onMigrationComplete={() => {
          setNeedsMigration(false);
          setIsInitialized(true);
      }} />
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-[#0a0f1f]">
      <div className="w-full max-w-sm text-center">
        <div className="mb-8">
            <LockIcon className="w-24 h-24 mx-auto text-cyan-400 neon-glow-text" />
        </div>
        <h1 className="text-4xl font-bold font-orbitron mb-2 text-cyan-300 neon-glow-text">
          {isInitialized ? 'Unlock Vault' : 'Create Vault'}
        </h1>
        <p className="mb-8 text-gray-400">
          {isInitialized ? 'Enter your master password to continue.' : 'Create a strong master password to secure your new vault.'}
        </p>

        <form onSubmit={handleSubmit}>
          <div className="relative mb-2 neon-glow-box-focus rounded-lg">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Master Password"
              className="w-full px-4 py-3 text-lg text-white bg-slate-800/50 border-2 border-slate-600 rounded-lg focus:outline-none focus:border-cyan-400 transition-colors duration-300"
              autoFocus
            />
          </div>
           {!isInitialized && <PasswordStrengthMeter password={password} />}
          
          {error && <p className="text-red-400 mt-4 mb-4">{error}</p>}

          <button
            type="submit"
            disabled={isLoading || !password}
            className="w-full px-8 py-4 mt-6 text-xl font-bold font-orbitron text-white bg-cyan-600/80 border-2 border-cyan-500 rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed neon-glow-box neon-glow-box-hover"
          >
            {isLoading ? 'Processing...' : (isInitialized ? 'Unlock' : 'Create')}
          </button>
        </form>
      </div>
    </div>
  );
};
