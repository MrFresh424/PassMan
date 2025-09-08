export interface VaultEntry {
  id: string; // Using string for UUIDs now
  title: string;
  username: string;
  password?: string; // Plaintext password, only used in UI state before encryption
  url: string;
  notes: string;
}

// Data stored inside the encrypted part of the vault
export interface VaultContent {
  entries: VaultEntry[];
  // Could add more things here later, like settings
}

export type KdfAlgorithm = 'argon2id' | 'pbkdf2';

export interface Argon2idParams {
  mem: number; // in KiB
  time: number; // iterations
  parallelism: number;
  salt: string; // base64
}

export interface Pbkdf2Params {
  iterations: number;
  salt: string; // base64
}

export type KdfParams = Argon2idParams | Pbkdf2Params;

// The structure of the vault.bin file header
export interface VaultHeader {
  magic: 'PMV1';
  kdf: KdfAlgorithm;
  kdfParams: KdfParams;
  cipher: 'AES-GCM';
  iv: string; // base64
}

// Old types for migration
export interface OldStoredEntry {
  id: number;
  title: string;
  username: string;
  encryptedPassword: {
    iv: string; // base64
    encryptedData: string; // base64
  };
  url: string;
  notes: string;
}

export interface OldVaultEntry {
    id?: number;
    title: string;
    username: string;
    password?: string;
    url: string;
    notes: string;
}
