import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { UploadsService } from '../uploads/uploads.service';
import type { RegisterDto } from '../auth/dto/register.dto';
import type { UpdateProfileDto } from './dto/update-profile.dto';

const PASSWORD_SALT_ROUNDS = 12;

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly uploads: UploadsService,
  ) {}

  findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
  }

  findByGoogleId(googleId: string) {
    return this.prisma.user.findUnique({ where: { googleId } });
  }

  findById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async create(dto: RegisterDto) {
    const existing = await this.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('An account with this email already exists');
    }

    const passwordHash = await bcrypt.hash(dto.password, PASSWORD_SALT_ROUNDS);

    return this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        role: dto.role,
        ...(dto.role === 'AGENT' && { agentProfile: { create: {} } }),
      },
    });
  }

  async findOrCreateGoogleUser(profile: {
    googleId: string;
    email: string;
    firstName: string;
    lastName: string;
    avatarUrl?: string;
  }) {
    const googleUser = await this.findByGoogleId(profile.googleId);
    if (googleUser) return googleUser;

    const email = profile.email.toLowerCase();
    const emailUser = await this.findByEmail(email);
    if (emailUser) {
      return this.prisma.user.update({
        where: { id: emailUser.id },
        data: {
          googleId: profile.googleId,
          avatarUrl: emailUser.avatarUrl ?? profile.avatarUrl,
        },
      });
    }

    return this.prisma.user.create({
      data: {
        email,
        passwordHash: null,
        googleId: profile.googleId,
        firstName: profile.firstName,
        lastName: profile.lastName,
        avatarUrl: profile.avatarUrl,
      },
    });
  }

  async getOrThrow(id: string) {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async update(id: string, dto: UpdateProfileDto) {
    const previous = await this.prisma.user.findUnique({
      where: { id },
      select: { avatarMediaId: true },
    });
    const updated = await this.prisma.user.update({ where: { id }, data: dto });

    // Only IDs issued by our upload endpoint are eligible. External Google
    // avatar URLs and listing media are never deleted by this path.
    if (
      dto.avatarMediaId &&
      previous?.avatarMediaId &&
      dto.avatarMediaId !== previous.avatarMediaId
    ) {
      await this.uploads.deleteMedia(previous.avatarMediaId).catch(() => undefined);
    }
    return updated;
  }
}
