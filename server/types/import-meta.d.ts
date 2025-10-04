// TypeScript shim for server build: ensure ImportMeta.env exists if client code is accidentally type-checked
interface ImportMeta {
  env: Record<string, string> & {
    DEV?: boolean;
    PROD?: boolean;
  };
}
