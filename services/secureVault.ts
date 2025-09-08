
import { OldStoredEntry, OldVaultEntry } from '../types';

const DB_NAME = 'PassmanVault';
const DB_VERSION = 1;
const METADATA_STORE = 'metadata';
const ENTRIES_STORE = 'entries';
const KEY_SALT = 'masterKeySalt';

let db: IDBDatabase;

// --- Helper Functions ---
const base64ToBuf = (b64: string) => Uint8Array.from(atob(b64), c => c.charCodeAt(0));
const bufToBase64 = (buf: Uint8Array) => btoa(String.fromCharCode(...new Uint8Array(buf)));

// --- DB Management ---
const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (db) return resolve(db);
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };
    request.onupgradeneeded = () => {
      const dbInstance = request.result;
      if (!dbInstance.objectStoreNames.contains(METADATA_STORE)) {
        dbInstance.createObjectStore(METADATA_STORE, { keyPath: 'key' });
      }
      if (!dbInstance.objectStoreNames.contains(ENTRIES_STORE)) {
        dbInstance.createObjectStore(ENTRIES_STORE, { keyPath: 'id', autoIncrement: true });
      }
    };
  });
};

const getFromStore = <T,>(storeName: string, key: IDBValidKey): Promise<T | undefined> => {
    return new Promise(async (resolve, reject) => {
        const db = await openDB();
        const transaction = db.transaction(storeName, 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.get(key);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result?.value);
    });
};

const getAllFromStore = <T,>(storeName: string): Promise<T[]> => {
    return new Promise(async (resolve, reject) => {
        const db = await openDB();
        const transaction = db.transaction(storeName, 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.getAll();
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
    });
};

const putInStore = (storeName: string, value: any, key?: IDBValidKey): Promise<void> => {
    return new Promise(async (resolve, reject) => {
        const db = await openDB();
        const transaction = db.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = key ? store.put({ key, value }) : store.put(value);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
    });
};


// --- Cryptography ---
const getMasterKeySalt = async (): Promise<Uint8Array | undefined> => {
    const saltB64 = await getFromStore<string>(METADATA_STORE, KEY_SALT);
    return saltB64 ? base64ToBuf(saltB64) : undefined;
};

const deriveKey = async (password: string, salt: Uint8Array): Promise<CryptoKey> => {
  const enc = new TextEncoder();
  const baseKey = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );
  return window.crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 250000, hash: 'SHA-256' },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
};

const encrypt = async (data: string, key: CryptoKey): Promise<{iv: string, encryptedData: string}> => {
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const enc = new TextEncoder();
    const encryptedData = await window.crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        enc.encode(data)
    );
    return {
        iv: bufToBase64(iv),
        encryptedData: bufToBase64(new Uint8Array(encryptedData))
    };
};

const decrypt = async (encryptedDataB64: string, ivB64: string, key: CryptoKey): Promise<string> => {
    const iv = base64ToBuf(ivB64);
    const encryptedData = base64ToBuf(encryptedDataB64);
    const decrypted = await window.crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        key,
        encryptedData
    );
    const dec = new TextDecoder();
    return dec.decode(decrypted);
};


// --- Public Vault API ---
export const vaultService = {
  async isVaultInitialized(): Promise<boolean> {
    try {
        const salt = await getMasterKeySalt();
        return !!salt;
    } catch {
        // If DB doesn't exist or is inaccessible, it's not initialized
        return false;
    }
  },

  async unlockVault(masterPassword: string): Promise<CryptoKey | null> {
    const salt = await getMasterKeySalt();
    if (!salt) return null;

    const key = await deriveKey(masterPassword, salt);
    const verificationData = await getFromStore<{iv: string, encryptedData: string}>(METADATA_STORE, 'verification');
    if (!verificationData) return null;

    try {
      const decrypted = await decrypt(verificationData.encryptedData, verificationData.iv, key);
      return decrypted === "VAULT_OK" ? key : null;
    } catch (e) {
      return null;
    }
  },

  async getAllEntries(masterKey: CryptoKey): Promise<OldVaultEntry[]> {
    const storedEntries = await getAllFromStore<OldStoredEntry>(ENTRIES_STORE);
    const entries: OldVaultEntry[] = [];
    for (const stored of storedEntries) {
        const password = await decrypt(stored.encryptedPassword.encryptedData, stored.encryptedPassword.iv, masterKey);
        entries.push({ ...stored, password });
    }
    return entries;
  },
};
