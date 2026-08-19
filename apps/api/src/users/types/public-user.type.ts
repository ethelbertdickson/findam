import type { User } from '@prisma/client';

export type PublicUser = Omit<User, 'passwordHash' | 'googleId'>;

export function toPublicUser(user: User): PublicUser {
  const {
    passwordHash: _passwordHash,
    googleId: _googleId,
    ...publicUser
  } = user;
  return publicUser;
}
