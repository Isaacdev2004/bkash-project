/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Empty in dev = same-origin `/api` via Vite proxy */
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
