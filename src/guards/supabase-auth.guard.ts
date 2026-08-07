import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { jwtVerify, createRemoteJWKSet } from 'jose';
import { Request } from 'express';
import config from '../core/config';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { SupabaseJwtPayload } from '../types/auth';

const jwks = createRemoteJWKSet(
  new URL('/auth/v1/.well-known/jwks.json', config.auth.supabaseUrl),
);

@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(
      IS_PUBLIC_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (isPublic) {
      return true;
    }

    const request: Request = context.switchToHttp().getRequest();
    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException('Missing bearer token');
    }

    try {
      const { payload } = await jwtVerify(token, jwks);
      const claims = payload as unknown as SupabaseJwtPayload;

      request.user = {
        id: claims.sub,
        email: claims.email,
        role: claims.role,
      };

      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  private extractToken(request: Request): string | null {
    const header = request.headers.authorization;
    if (!header) {
      return null;
    }
    const [type, token] = header.split(' ');
    return type === 'Bearer' && token ? token : null;
  }
}
