/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_RAKAZ_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
