import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { compare } from 'bcryptjs';
import type { Request } from 'express';
import { UserRole } from './entities';

export type AuthUser = {
  id: number | null;
  email?: string;
  role: UserRole;
};

@Injectable()
export class AuthService {
  constructor(private readonly jwtService: JwtService) {}

  async adminLogin(email: string, password: string) {
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPasswordHash = process.env.ADMIN_PASSWORD;
    const jwtSecret = process.env.JWT_SECRET;

    if (!adminEmail || !adminPasswordHash || !jwtSecret) {
      throw new UnauthorizedException('Admin login is not configured.');
    }

    const isBcryptHash = adminPasswordHash.startsWith('$2');
    const passwordMatches =
      isBcryptHash && (await compare(password, adminPasswordHash));

    if (email !== adminEmail || !passwordMatches) {
      throw new UnauthorizedException('Invalid admin credentials.');
    }

    const payload: AuthUser = {
      id: null,
      email: adminEmail,
      role: UserRole.Admin,
    };

    return {
      accessToken: await this.jwtService.signAsync(payload),
      user: payload,
    };
  }

  getRequestUser(request: Request): AuthUser | null {
    const authHeader = request.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      try {
        const payload = this.jwtService.verify<AuthUser>(
          authHeader.slice('Bearer '.length),
        );
        return payload;
      } catch {
        throw new UnauthorizedException('Invalid token.');
      }
    }

    const userIdHeader = request.headers['x-user-id'];
    const userId = Array.isArray(userIdHeader) ? userIdHeader[0] : userIdHeader;
    if (userId && Number.isInteger(Number(userId))) {
      return { id: Number(userId), role: UserRole.User };
    }

    return null;
  }

  assertAdmin(user: AuthUser | null) {
    if (user?.role !== UserRole.Admin) {
      throw new ForbiddenException('Admin permission is required.');
    }
  }

  assertAdminOrSelf(user: AuthUser | null, userId: number) {
    if (user?.role === UserRole.Admin) return;
    if (user?.role === UserRole.User && user.id === userId) return;
    throw new ForbiddenException('You can only manage your own data.');
  }
}
