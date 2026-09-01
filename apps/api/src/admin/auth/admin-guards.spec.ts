import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Role } from '@prisma/client';
import {
  ADMIN_CSRF_COOKIE,
  ADMIN_CSRF_HEADER,
} from '../../auth/constants/admin-session.constants';
import { AdminCsrfGuard } from './admin-csrf.guard';
import { AdminRoleGuard } from './admin-role.guard';

describe('administrator guards', () => {
  const roleGuard = new AdminRoleGuard();
  const csrfGuard = new AdminCsrfGuard();

  it('allows an administrator payload', () => {
    const context = httpContext({
      user: { sub: 'admin-id', email: 'admin@findam.test', role: Role.ADMIN },
    });
    expect(roleGuard.canActivate(context)).toBe(true);
  });

  it('rejects a non-admin payload', () => {
    const context = httpContext({
      user: { sub: 'user-id', email: 'user@findam.test', role: Role.USER },
    });
    expect(() => roleGuard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('accepts matching CSRF cookie and header values', () => {
    const context = httpContext({
      cookies: { [ADMIN_CSRF_COOKIE]: 'matching-token' },
      headers: { [ADMIN_CSRF_HEADER]: 'matching-token' },
    });
    expect(csrfGuard.canActivate(context)).toBe(true);
  });

  it('rejects missing or mismatched CSRF values', () => {
    const missing = httpContext({ cookies: {}, headers: {} });
    const mismatched = httpContext({
      cookies: { [ADMIN_CSRF_COOKIE]: 'cookie-token' },
      headers: { [ADMIN_CSRF_HEADER]: 'header-token' },
    });

    expect(() => csrfGuard.canActivate(missing)).toThrow(ForbiddenException);
    expect(() => csrfGuard.canActivate(mismatched)).toThrow(ForbiddenException);
  });
});

function httpContext(request: Record<string, unknown>): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}
