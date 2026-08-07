import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';
import { Config } from '../../types/config';

const rootDir = process.cwd();
const envFilePath = path.join(
  rootDir,
  `.env.${process.env.NODE_ENV || 'local'}`,
);

if (fs.existsSync(envFilePath)) {
  dotenv.config({ path: envFilePath });
} else {
  dotenv.config();
}

const listenPort = parseInt(process.env.PORT) || 3001;

const config: Config = {
  database: {
    type: 'postgres',
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT) || 5432,
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  },
  app: {
    env: (process.env.ENV || 'development') as any,
    listenPort,
    host: process.env.HOST,
    appName: process.env.APP_NAME || 'Jarvis API',
    versionName: process.env.VERSION_NAME || 'v1',
    allowedOrigins: (process.env.ALLOWED_ORIGINS || '')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
  },
  auth: {
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseJwtSecret: process.env.SUPABASE_JWT_SECRET,
  },
  storage: {
    supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    bucket: process.env.SUPABASE_STORAGE_BUCKET,
  },
};

export default config;
