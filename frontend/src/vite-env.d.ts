/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** API base path baked into the build. Defaults to the relative "/api/v1". */
  readonly VITE_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
