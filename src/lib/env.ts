function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

export const PHOTO_JWT_SECRET = new TextEncoder().encode(requireEnv('PHOTO_JWT_SECRET'));
export const R2_ACCOUNT_ID = requireEnv('R2_ACCOUNT_ID');
export const R2_ACCESS_KEY_ID = requireEnv('R2_ACCESS_KEY_ID');
export const R2_SECRET_ACCESS_KEY = requireEnv('R2_SECRET_ACCESS_KEY');
export const R2_BUCKET_NAME = requireEnv('R2_BUCKET_NAME');
