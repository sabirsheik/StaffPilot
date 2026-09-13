import 'dotenv/config';

const isProduction = process.env.NODE_ENV === 'production';

const requireEnv = (name: string): string => {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
};

export const env = {
  nodeEnv: process.env.NODE_ENV?.trim() || 'development',
  port: Number(process.env.PORT) || 5000,
  mongoUri: isProduction
    ? requireEnv('MONGO_URI')
    : process.env.MONGO_URI?.trim() || 'mongodb://127.0.0.1:27017/staffpilot',
  jwtSecret: isProduction
    ? requireEnv('JWT_SECRET')
    : process.env.JWT_SECRET?.trim() || 'development-only-secret',
  superAdminUsername: isProduction
    ? requireEnv('SUPER_ADMIN_USERNAME')
    : process.env.SUPER_ADMIN_USERNAME?.trim() || 'admin',
  superAdminPassword: isProduction
    ? requireEnv('SUPER_ADMIN_PASSWORD')
    : process.env.SUPER_ADMIN_PASSWORD?.trim() || 'admin123',
  clientUrl: isProduction ? requireEnv('CLIENT_URL') : process.env.CLIENT_URL?.trim() || 'http://localhost:5173',
  uploadsDir: process.env.UPLOADS_DIR?.trim(),
};

if (isProduction && env.jwtSecret.length < 32) {
  throw new Error('JWT_SECRET must be at least 32 characters in production.');
}

if (!Number.isInteger(env.port) || env.port < 1 || env.port > 65535) {
  throw new Error('PORT must be a valid TCP port between 1 and 65535.');
}

export { isProduction };
