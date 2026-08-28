type DBConfig = {
  type: 'postgres';
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
};

type AppConfig = {
  env: 'development' | 'staging' | 'production';
  listenPort: number;
  host: string;
  appName: string;
  versionName: string;
  allowedOrigins: string[];
};

type AuthConfig = {
  supabaseUrl: string;
  supabaseJwtSecret: string;
};

type StorageConfig = {
  supabaseServiceRoleKey: string;
  bucket: string;
};

type AiConfig = {
  anthropicApiKey: string;
  chatModel: string;
};

export type Config = {
  database: DBConfig;
  app: AppConfig;
  auth: AuthConfig;
  storage: StorageConfig;
  ai: AiConfig;
};
