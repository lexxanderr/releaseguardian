import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from './roles.decorator';
import { Role } from './role.enum';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles =
      this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? [];

    if (requiredRoles.length === 0) return true;

    const req = context.switchToHttp().getRequest();

    const raw = req.headers['x-rg-role'] ?? req.headers['X-RG-ROLE'];
    const value = Array.isArray(raw) ? raw[0] : raw;
    const role = (value ? String(value).toUpperCase() : undefined) as Role | undefined;

    if (!role) {
      throw new ForbiddenException('Missing role (x-rg-role header).');
    }

    if (!Object.values(Role).includes(role)) {
      throw new ForbiddenException(`Invalid role: ${role}`);
    }

    if (!requiredRoles.includes(role)) {
      throw new ForbiddenException(
        `Insufficient role. Required: ${requiredRoles.join(', ')}.`,
      );
    }

    req.user = { ...(req.user ?? {}), role };
    return true;
  }
}
