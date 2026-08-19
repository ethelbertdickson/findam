import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AgentProfileDto } from './dto/agent-profile.dto';
import { CreateRatingDto } from './dto/create-rating.dto';

const profileInclude = {
  user: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      avatarUrl: true,
      role: true,
      createdAt: true,
    },
  },
  country: { select: { id: true, name: true } },
  state: { select: { id: true, name: true } },
  _count: { select: { ratingsReceived: true } },
} satisfies Prisma.AgentProfileInclude;

@Injectable()
export class AgentsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.agentProfile.findMany({
      include: profileInclude,
      orderBy: [{ isVerified: 'desc' }, { averageRating: 'desc' }],
      take: 50,
    });
  }

  async findOne(id: string) {
    const agent = await this.prisma.agentProfile.findUnique({
      where: { id },
      include: profileInclude,
    });
    if (!agent) throw new NotFoundException('Agent not found');
    return agent;
  }

  async findByUserId(userId: string) {
    return this.prisma.agentProfile.findUnique({
      where: { userId },
      include: profileInclude,
    });
  }

  async upsert(userId: string, dto: AgentProfileDto) {
    const { profileImageUrl: _profileImageUrl, ...profile } = dto;
    return this.prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: userId }, data: { role: 'AGENT' } });
      return tx.agentProfile.upsert({
        where: { userId },
        create: { userId, ...profile },
        update: profile,
        include: profileInclude,
      });
    });
  }

  async listings(id: string, page = 1, limit = 20) {
    const agent = await this.findOne(id);
    const skip = (page - 1) * limit;
    const [items, total] = await this.prisma.$transaction([
      this.prisma.listing.findMany({
        where: { ownerId: agent.userId, status: 'ACTIVE', deletedAt: null },
        include: {
          images: { orderBy: { position: 'asc' } },
          country: true,
          state: true,
          city: true,
          area: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: Math.min(limit, 50),
      }),
      this.prisma.listing.count({
        where: { ownerId: agent.userId, status: 'ACTIVE', deletedAt: null },
      }),
    ]);
    return {
      items: items.map((item) => ({ ...item, price: Number(item.price) })),
      page,
      limit,
      total,
      hasNextPage: skip + items.length < total,
    };
  }

  async ratings(id: string, page = 1, limit = 20) {
    await this.findOne(id);
    const skip = (page - 1) * limit;
    const [items, total] = await this.prisma.$transaction([
      this.prisma.agentRating.findMany({
        where: { agentId: id },
        include: {
          author: {
            select: { firstName: true, lastName: true, avatarUrl: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: Math.min(limit, 50),
      }),
      this.prisma.agentRating.count({ where: { agentId: id } }),
    ]);
    return {
      items,
      page,
      limit,
      total,
      hasNextPage: skip + items.length < total,
    };
  }

  async rate(agentId: string, authorId: string, dto: CreateRatingDto) {
    await this.findOne(agentId);
    try {
      const rating = await this.prisma.agentRating.create({
        data: { agentId, authorId, ...dto },
      });
      const aggregate = await this.prisma.agentRating.aggregate({
        where: { agentId },
        _avg: { overallRating: true },
        _count: { _all: true },
      });
      await this.prisma.agentProfile.update({
        where: { id: agentId },
        data: {
          averageRating: aggregate._avg.overallRating ?? 0,
          reviewCount: aggregate._count._all,
        },
      });
      return rating;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      )
        throw new ConflictException('You have already rated this agent');
      throw error;
    }
  }
}
