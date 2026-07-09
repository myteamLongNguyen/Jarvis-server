export class SupabaseJwtPayload {
  sub: string;
  email?: string;
  role?: string;
  aud?: string;
  exp?: number;
}

export class AuthUserPayload {
  id: string;
  email?: string;
  role?: string;
}
