import React, { useState, useMemo } from 'react';
import { fileVaultService } from '../services/fileVault';
import { VaultEntry, VaultContent, VaultHeader } from '../types';
import { useCopyToClipboard } from '../hooks/useCopyToClipboard';
import { AddEditModal } from './AddEditModal';
import { ConfirmModal } from './ConfirmModal';
import { SettingsModal } from './SettingsModal';
import { PlusIcon, CopyIcon, EditIcon, TrashIcon, CheckIcon, SettingsIcon } from './Icons';


interface DashboardProps {
  masterKey: CryptoKey;
  vaultContent: VaultContent;
  vaultHeader: VaultHeader;
  onLock: () => void;
  onVaultChange: (content: VaultContent) => void;
  settings: any;
  onSettingsChange: (settings: any) => void;
  addToast: (message: string, duration?: number) => void;
}

const EntryCard: React.FC<{
    entry: VaultEntry;
    onEdit: (entry: VaultEntry) => void;
    onDelete: (id: string) => void;
    clipboardClearSeconds: number;
    addToast: (message: string) => void;
}> = ({ entry, onEdit, onDelete, clipboardClearSeconds, addToast }) => {
    const [isUsernameCopied, copyUsername] = useCopyToClipboard();
    const [isPasswordCopied, copyPassword] = useCopyToClipboard();

    const handleCopy = (text: string, type: 'Username' | 'Password') => {
        const copyFn = type === 'Username' ? copyUsername : copyPassword;
        copyFn(text, clipboardClearSeconds * 1000).then(success => {
            if (success) {
                addToast(`${type} copied. Will clear in ${clipboardClearSeconds}s.`);
            }
        });
    };

    return (
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 transition-all duration-300 hover:border-cyan-500/70 hover:shadow-2xl hover:shadow-cyan-900/50">
            <div className="flex justify-between items-start">
                <div>
                    <h3 className="text-xl font-bold text-cyan-300 font-orbitron">{entry.title}</h3>
                    <p className="text-sm text-gray-400 break-all">{entry.username}</p>
                    {entry.url && <a href={entry.url} target="_blank" rel="noopener noreferrer" className="text-xs text-cyan-500 hover:underline break-all">{entry.url}</a>}
                </div>
                <div className="flex space-x-2">
                    <button onClick={() => onEdit(entry)} className="p-2 text-gray-400 hover:text-cyan-400 transition-colors" aria-label={`Edit ${entry.title}`}><EditIcon className="w-5 h-5" /></button>
                    <button onClick={() => onDelete(entry.id!)} className="p-2 text-gray-400 hover:text-red-400 transition-colors" aria-label={`Delete ${entry.title}`}><TrashIcon className="w-5 h-5" /></button>
                </div>
            </div>
            <div className="mt-4 flex space-x-2">
                <button onClick={() => handleCopy(entry.username, 'Username')} className="flex-1 text-sm flex items-center justify-center space-x-2 bg-slate-700/50 px-3 py-2 rounded-md hover:bg-slate-600/50 transition-colors">
                    {isUsernameCopied ? <CheckIcon className="w-4 h-4 text-green-400"/> : <CopyIcon className="w-4 h-4"/>}
                    <span>{isUsernameCopied ? 'Copied!' : 'Copy User'}</span>
                </button>
                <button onClick={() => handleCopy(entry.password!, 'Password')} className="flex-1 text-sm flex items-center justify-center space-x-2 bg-slate-700/50 px-3 py-2 rounded-md hover:bg-slate-600/50 transition-colors">
                    {isPasswordCopied ? <CheckIcon className="w-4 h-4 text-green-400"/> : <CopyIcon className="w-4 h-4"/>}
                    <span>{isPasswordCopied ? 'Copied!' : 'Copy Pass'}</span>
                </button>
            </div>
        </div>
    );
};


export const Dashboard: React.FC<DashboardProps> = (props) => {
  const { masterKey, vaultContent, vaultHeader, onLock, onVaultChange, settings, onSettingsChange, addToast } = props;
  
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddEditModalOpen, setAddEditModalOpen] = useState(false);
  const [isSettingsModalOpen, setSettingsModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<VaultEntry | null>(null);
  const [deletingEntryId, setDeletingEntryId] = useState<string | null>(null);

  const entries = useMemo(() => {
    return [...vaultContent.entries].sort((a,b) => a.title.localeCompare(b.title));
  }, [vaultContent.entries]);

  const handleSaveEntry = async (entry: VaultEntry) => {
    try {
        let newEntries: VaultEntry[];
        if (entry.id) { // Editing existing
            newEntries = entries.map(e => e.id === entry.id ? entry : e);
        } else { // Adding new
            newEntries = [...entries, { ...entry, id: crypto.randomUUID() }];
        }
        const newVaultContent = { ...vaultContent, entries: newEntries };
        await fileVaultService.saveVault(masterKey, newVaultContent, vaultHeader);
        onVaultChange(newVaultContent);
        setAddEditModalOpen(false);
        setEditingEntry(null);
    } catch (err) {
        console.error(err);
        addToast('Failed to save entry.', 5000);
    }
  };
  
  const requestDeleteEntry = (id: string) => {
    setDeletingEntryId(id);
  };

  const handleConfirmDelete = async () => {
    if (deletingEntryId === null) return;
    try {
        const newEntries = entries.filter(e => e.id !== deletingEntryId);
        const newVaultContent = { ...vaultContent, entries: newEntries };
        await fileVaultService.saveVault(masterKey, newVaultContent, vaultHeader);
        onVaultChange(newVaultContent);
    } catch (err) {
        console.error(err);
        addToast('Failed to delete entry.', 5000);
    } finally {
        setDeletingEntryId(null);
    }
  };

  const openAddModal = () => {
    setEditingEntry(null);
    setAddEditModalOpen(true);
  };
  
  const openEditModal = (entry: VaultEntry) => {
    setEditingEntry(entry);
    setAddEditModalOpen(true);
  };

  const filteredEntries = useMemo(() => {
    if (!searchQuery) return entries;
    return entries.filter(e =>
      e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.url.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [entries, searchQuery]);

  return (
    <div className="min-h-screen bg-[#0a0f1f] flex flex-col p-4 sm:p-6 lg:p-8">
      <header className="flex justify-between items-center mb-6 gap-4">
        <h1 className="text-3xl font-orbitron text-cyan-300 neon-glow-text whitespace-nowrap">Passman Vault</h1>
        <div className="flex items-center gap-2">
            <button onClick={() => setSettingsModalOpen(true)} className="p-2 rounded-md text-gray-300 bg-slate-700 hover:bg-slate-600 transition-colors" aria-label="Open Settings">
                <SettingsIcon className="w-5 h-5" />
            </button>
            <button onClick={onLock} className="px-4 py-2 rounded-md text-gray-300 bg-slate-700 hover:bg-slate-600 transition-colors">Lock Vault</button>
        </div>
      </header>

      <div className="mb-6">
          <input 
            type="text"
            placeholder="Search vault..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full max-w-lg px-4 py-2 bg-slate-800 border-2 border-slate-700 rounded-lg focus:outline-none focus:border-cyan-500 transition-colors"
          />
      </div>

        <main className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 overflow-y-auto scrollbar-hide">
          {filteredEntries.length > 0 ? (
            filteredEntries.map(entry => (
              <EntryCard 
                key={entry.id} 
                entry={entry} 
                onEdit={openEditModal} 
                onDelete={requestDeleteEntry} 
                clipboardClearSeconds={settings.clipboardClearSeconds}
                addToast={addToast}
              />
            ))
          ) : (
            <div className="col-span-full text-center py-16">
                <p className="text-gray-400">
                    {searchQuery ? 'No entries match your search.' : 'Your vault is empty. Add a new entry to get started!'}
                </p>
            </div>
          )}
        </main>

      <button
        onClick={openAddModal}
        className="fixed bottom-8 right-8 w-16 h-16 bg-cyan-600 rounded-full flex items-center justify-center text-white shadow-lg transition-all duration-300 neon-glow-box neon-glow-box-hover"
        aria-label="Add new entry"
      >
        <PlusIcon className="w-8 h-8" />
      </button>

      {isAddEditModalOpen && (
        <AddEditModal 
            entry={editingEntry}
            onClose={() => setAddEditModalOpen(false)}
            onSave={handleSaveEntry}
        />
      )}

       {isSettingsModalOpen && (
        <SettingsModal
            onClose={() => setSettingsModalOpen(false)}
            settings={settings}
            onSettingsChange={onSettingsChange}
            vaultHeader={vaultHeader}
        />
      )}

      {deletingEntryId !== null && (
        <ConfirmModal 
            onClose={() => setDeletingEntryId(null)}
            onConfirm={handleConfirmDelete}
            title="Confirm Deletion"
            message="Are you sure you want to permanently delete this entry? This action cannot be undone."
        />
      )}
    </div>
  );
};
