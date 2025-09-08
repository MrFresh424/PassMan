import React, { useState, useEffect } from 'react';
import { LockScreen } from './components/LockScreen';
import { Dashboard } from './components/Dashboard';
import { useIdleTimer } from './hooks/useIdleTimer';
import { VaultContent, VaultHeader } from './types';
import { ToastContainer, ToastData } from './components/Toast';

// Default settings
const DEFAULT_SETTINGS = {
    autoLockMinutes: 5,
    lockOnBlur: true,
    clipboardClearSeconds: 30,
};

const App: React.FC = () => {
  const [masterKey, setMasterKey] = useState<CryptoKey | null>(null);
  const [vaultContent, setVaultContent] = useState<VaultContent | null>(null);
  const [vaultHeader, setVaultHeader] = useState<VaultHeader | null>(null);
  const [toasts, setToasts] = useState<ToastData[]>([]);

  // Settings are stored in localStorage as they are not secret
  const [settings, setSettings] = useState(() => {
    try {
      const stored = localStorage.getItem('passman_settings');
      const parsed = stored ? JSON.parse(stored) : {};
      return { ...DEFAULT_SETTINGS, ...parsed };
    } catch {
      return DEFAULT_SETTINGS;
    }
  });

  const handleLock = () => {
    setMasterKey(null);
    setVaultContent(null);
    setVaultHeader(null);
  };

  useIdleTimer(handleLock, settings.autoLockMinutes * 60 * 1000);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && settings.lockOnBlur && masterKey) {
        handleLock();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [settings.lockOnBlur, masterKey]);
  
  const handleUnlock = (key: CryptoKey, content: VaultContent, header: VaultHeader) => {
    setMasterKey(key);
    setVaultContent(content);
    setVaultHeader(header);
  };
  
  const addToast = (message: string, duration?: number) => {
    const newToast: ToastData = { id: Date.now(), message, duration };
    setToasts(current => [...current, newToast]);
  };

  const removeToast = (id: number) => {
    setToasts(current => current.filter(t => t.id !== id));
  };
  
  return (
    <div className="min-h-screen bg-[#0a0f1f]">
      {masterKey && vaultContent && vaultHeader ? (
        <Dashboard
            masterKey={masterKey}
            vaultContent={vaultContent}
            vaultHeader={vaultHeader}
            onLock={handleLock}
            onVaultChange={setVaultContent}
            settings={settings}
            onSettingsChange={setSettings}
            addToast={addToast}
        />
      ) : (
        <LockScreen onUnlock={handleUnlock} />
      )}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </div>
  );
};

export default App;
