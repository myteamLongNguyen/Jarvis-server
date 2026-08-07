import { Injectable } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import config from '../config';

@Injectable()
export class SupabaseAdminService {
  readonly client: SupabaseClient;
  readonly bucket: string;

  constructor() {
    this.client = createClient(config.auth.supabaseUrl, config.storage.supabaseServiceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    this.bucket = config.storage.bucket;
  }
}
