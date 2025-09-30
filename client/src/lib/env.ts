function getViteEnv(): any | null {
  try {
    // @ts-ignore
    const meta: any = import.meta;
    if (meta && meta.env) return meta.env;
  } catch (e) {
    // ignore
  }
  return null;
}

export function isTestEnv(): boolean {
  return typeof window !== 'undefined' && (window as any).__TEST__ === true;
}

export function isDevEnv(): boolean {
  const env = getViteEnv();
  if (env && typeof env.DEV !== 'undefined') return !!env.DEV;
  return process.env.NODE_ENV === 'development';
}

export function isProdEnv(): boolean {
  const env = getViteEnv();
  if (env && typeof env.PROD !== 'undefined') return !!env.PROD;
  return process.env.NODE_ENV === 'production';
}
