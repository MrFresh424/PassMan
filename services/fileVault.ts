// services/fileVault.ts
import { VaultHeader, VaultContent, KdfParams, KdfAlgorithm, Argon2idParams, Pbkdf2Params } from '../types';
import { encrypt, decrypt, deriveKey, bufToBase64, base64ToBuf, DEFAULT_ARGON2_PARAMS, DEFAULT_PBKDF2_PARAMS } from './crypto';

const MAGIC_V1 = 'PMV1';
const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

async function createVaultFile(header: VaultHeader, encryptedContent: Uint8Array): Promise<Uint8Array> {
    const headerJson = JSON.stringify(header);
    const headerBytes = textEncoder.encode(headerJson);
    const headerLength = new Uint8Array(2);
    new DataView(headerLength.buffer).setUint16(0, headerBytes.length, false); // Big Endian

    const fileBytes = new Uint8Array(headerLength.length + headerBytes.length + encryptedContent.length);
    fileBytes.set(headerLength, 0);
    fileBytes.set(headerBytes, 2);
    fileBytes.set(encryptedContent, 2 + headerBytes.length);

    return fileBytes;
}

async function parseVaultFile(fileBytes: Uint8Array): Promise<{ header: VaultHeader, encryptedContent: Uint8Array }> {
    const headerLength = new DataView(fileBytes.buffer, 0, 2).getUint16(0, false);
    const headerBytes = fileBytes.subarray(2, 2 + headerLength);
    const header = JSON.parse(textDecoder.decode(headerBytes)) as VaultHeader;
    const encryptedContent = fileBytes.subarray(2 + headerLength);
    
    if (header.magic !== MAGIC_V1) {
        throw new Error("Invalid or unsupported vault file format.");
    }

    return { header, encryptedContent };
}


export const fileVaultService = {
    async isVaultInitialized(): Promise<boolean> {
        return window.electron.vault.exists();
    },

    async createVault(masterPassword: string, initialContent: VaultContent): Promise<CryptoKey> {
        let kdf: KdfAlgorithm = 'argon2id';
        let kdfParams: KdfParams;

        try {
            await import('argon2-browser'); // check if it loads
            const salt = window.crypto.getRandomValues(new Uint8Array(16));
            kdfParams = { ...DEFAULT_ARGON2_PARAMS, salt: bufToBase64(salt) };
        } catch (e) {
            console.warn("Could not load Argon2, falling back to PBKDF2 for new vault creation.");
            kdf = 'pbkdf2';
            const salt = window.crypto.getRandomValues(new Uint8Array(16));
            kdfParams = { ...DEFAULT_PBKDF2_PARAMS, salt: bufToBase64(salt) };
        }
        
        const masterKey = await deriveKey(masterPassword, kdfParams);
        
        const contentJson = JSON.stringify(initialContent);
        const contentBytes = textEncoder.encode(contentJson);
        const { iv, ciphertext } = await encrypt(contentBytes, masterKey);

        const header: VaultHeader = {
            magic: 'PMV1',
            kdf,
            kdfParams,
            cipher: 'AES-GCM',
            iv: bufToBase64(iv),
        };

        const fileBytes = await createVaultFile(header, ciphertext);
        const result = await window.electron.vault.write(Array.from(fileBytes));
        if (!result.ok) throw new Error(result.error);
        
        return masterKey;
    },

    async unlockVault(masterPassword: string): Promise<{ masterKey: CryptoKey, content: VaultContent, header: VaultHeader } | null> {
        const response = await window.electron.vault.read();
        if (!response.ok) throw new Error(response.error);
        if (!response.data) return null;

        try {
            const fileBytes = new Uint8Array(response.data);
            const { header, encryptedContent } = await parseVaultFile(fileBytes);
            
            const masterKey = await deriveKey(masterPassword, header.kdfParams);

            const iv = base64ToBuf(header.iv);
            const decryptedBytes = await decrypt(encryptedContent, iv, masterKey);
            const content = JSON.parse(textDecoder.decode(decryptedBytes)) as VaultContent;

            return { masterKey, content, header };
        } catch (e) {
            console.error("Failed to unlock vault:", e);
            return null; // Decryption failed, likely wrong password
        }
    },

    async saveVault(masterKey: CryptoKey, content: VaultContent, header: VaultHeader): Promise<void> {
        const contentJson = JSON.stringify(content);
        const contentBytes = textEncoder.encode(contentJson);
        
        // Re-encrypt with a new IV for security
        const { iv, ciphertext } = await encrypt(contentBytes, masterKey);
        
        const newHeader: VaultHeader = { ...header, iv: bufToBase64(iv) };
        const fileBytes = await createVaultFile(newHeader, ciphertext);
        
        const result = await window.electron.vault.write(Array.from(fileBytes));
        if (!result.ok) throw new Error(result.error);
    }
};
