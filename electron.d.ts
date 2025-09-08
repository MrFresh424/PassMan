// electron.d.ts
export {};

declare global {
  interface Window {
    electron: {
      vault: {
        exists: () => Promise<boolean>;
        read: () => Promise<{ ok: boolean; data: number[] | null; error?: string }>;
        write: (data: number[]) => Promise<{ ok: boolean; error?: string }>;
      };
    };
  }
}
