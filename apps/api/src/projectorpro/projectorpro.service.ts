import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';

type CreditPackage = { code: string; amountKobo: number; minutes: number };

const DEFAULT_PACKAGES: CreditPackage[] = [
  { code: 'starter', amountKobo: 100_000, minutes: 60 },
  { code: 'standard', amountKobo: 250_000, minutes: 180 },
  { code: 'worship', amountKobo: 500_000, minutes: 420 },
];

@Injectable()
export class ProjectorProService {
  private readonly logger = new Logger(ProjectorProService.name);

  constructor(private readonly prisma: PrismaService) {}

  packages() {
    return DEFAULT_PACKAGES.map((item) => ({
      ...item,
      currency: 'NGN',
      seconds: item.minutes * 60,
    }));
  }

  async balance(userId: string) {
    const wallet = await this.prisma.projectorProWallet.findUnique({ where: { userId } });
    return { seconds: wallet?.balanceSeconds ?? 0, minutes: Math.floor((wallet?.balanceSeconds ?? 0) / 60) };
  }

  async initializeCheckout(userId: string, packageCode: string) {
    const selected = DEFAULT_PACKAGES.find((item) => item.code === packageCode);
    if (!selected) throw new BadRequestException('Unknown credit package.');

    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
    if (!user) throw new BadRequestException('User account was not found.');
    const secret = process.env.PAYSTACK_SECRET_KEY;
    if (!secret) throw new InternalServerErrorException('Payment service is not configured.');

    const reference = `pp_${randomUUID().replaceAll('-', '')}`;
    const response = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: user.email,
        amount: selected.amountKobo,
        currency: 'NGN',
        reference,
        metadata: { product: 'projectorpro', packageCode: selected.code, userId },
      }),
    });
    const result = (await response.json()) as { status?: boolean; message?: string; data?: { authorization_url?: string; reference?: string } };
    if (!response.ok || !result.status || !result.data?.authorization_url)
      throw new BadRequestException(result.message ?? 'Paystack checkout could not be initialized.');

    await this.prisma.projectorProPurchase.create({
      data: {
        userId, packageCode: selected.code, amountKobo: selected.amountKobo,
        creditSeconds: selected.minutes * 60, paystackRef: reference, status: 'PENDING',
      },
    });
    return { authorizationUrl: result.data.authorization_url, reference };
  }

  async issueDeepgramToken(userId: string, installationId: string, isAdministrator = false) {
    if (!installationId?.trim()) throw new BadRequestException('installationId is required.');
    const reserveSeconds = 60;
    if (!isAdministrator) {
      const wallet = await this.prisma.projectorProWallet.findUnique({ where: { userId } });
      if (!wallet || wallet.balanceSeconds < reserveSeconds)
        throw new ForbiddenException('Purchase Deepgram credits to start transcription.');
    }

    const deepgramKey = process.env.DEEPGRAM_API_KEY;
    if (!deepgramKey) throw new InternalServerErrorException('Deepgram service is not configured.');

    const session = isAdministrator ? null : await this.prisma.$transaction(async (tx) => {
      const current = await tx.projectorProWallet.updateMany({
        where: { userId, balanceSeconds: { gte: reserveSeconds } },
        data: { balanceSeconds: { decrement: reserveSeconds } },
      });
      if (current.count !== 1) throw new ForbiddenException('Purchase Deepgram credits to start transcription.');
      const updatedWallet = await tx.projectorProWallet.findUniqueOrThrow({ where: { userId } });
      const created = await tx.projectorProSession.create({ data: { userId, installationId: installationId.trim(), reservedSeconds: reserveSeconds } });
      await tx.projectorProCreditEntry.create({
        data: { walletId: updatedWallet.id, type: 'RESERVATION', seconds: -reserveSeconds, reference: `session:${created.id}`, description: 'Deepgram session reservation' },
      });
      return created;
    });

    const response = await fetch('https://api.deepgram.com/v1/auth/grant', {
      method: 'POST',
      headers: { Authorization: `Token ${deepgramKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ttl_seconds: 3600 }),
    });
    const result = (await response.json()) as { access_token?: string; expires_in?: number };
    if (!response.ok || !result.access_token) {
      if (session) await this.releaseSession(session.id);
      throw new BadRequestException('Deepgram token could not be issued.');
    }
    return { token: result.access_token, sessionId: session?.id ?? null, expiresIn: result.expires_in ?? 3600 };
  }

  async processPaystackWebhook(signature: string, rawBody: Buffer | undefined, body: unknown) {
    const secret = process.env.PAYSTACK_SECRET_KEY;
    if (!secret || !signature || !rawBody) throw new ForbiddenException('Invalid payment webhook.');
    const expected = createHmac('sha512', secret).update(rawBody).digest('hex');
    const actual = Buffer.from(signature, 'utf8');
    const expectedBuffer = Buffer.from(expected, 'utf8');
    if (actual.length !== expectedBuffer.length || !timingSafeEqual(actual, expectedBuffer))
      throw new ForbiddenException('Invalid payment webhook.');

    const event = body as { event?: string; data?: { status?: string; reference?: string; metadata?: { userId?: string; packageCode?: string }; amount?: number } };
    if (event.event !== 'charge.success' || !event.data?.reference) return { received: true };
    const reference = event.data.reference;
    const purchase = await this.prisma.projectorProPurchase.findUnique({ where: { paystackRef: reference } });
    if (!purchase || purchase.status === 'SUCCESS') return { received: true };
    if (event.data.status !== 'success') return { received: true };

    await this.prisma.$transaction(async (tx) => {
      const updated = await tx.projectorProPurchase.updateMany({ where: { paystackRef: reference, status: 'PENDING' }, data: { status: 'SUCCESS', fulfilledAt: new Date() } });
      if (updated.count !== 1) return;
      const wallet = await tx.projectorProWallet.upsert({ where: { userId: purchase.userId }, create: { userId: purchase.userId, balanceSeconds: purchase.creditSeconds }, update: { balanceSeconds: { increment: purchase.creditSeconds } } });
      await tx.projectorProCreditEntry.create({ data: { walletId: wallet.id, type: 'PURCHASE', seconds: purchase.creditSeconds, reference: `purchase:${purchase.paystackRef}`, description: `${purchase.packageCode} Deepgram credits`, metadata: { paystackReference: purchase.paystackRef } } });
    });
    return { received: true };
  }

  private async releaseSession(sessionId: string) {
    const session = await this.prisma.projectorProSession.findUnique({ where: { id: sessionId } });
    if (!session || session.status !== 'ACTIVE') return;
    const wallet = await this.prisma.projectorProWallet.findUnique({ where: { userId: session.userId } });
    if (!wallet) return;
    await this.prisma.$transaction([
      this.prisma.projectorProSession.update({ where: { id: sessionId }, data: { status: 'EXPIRED', completedAt: new Date() } }),
      this.prisma.projectorProWallet.update({ where: { id: wallet.id }, data: { balanceSeconds: { increment: session.reservedSeconds } } }),
      this.prisma.projectorProCreditEntry.create({ data: { walletId: wallet.id, type: 'RELEASE', seconds: session.reservedSeconds, reference: `release:${sessionId}`, description: 'Released failed Deepgram session reservation' } }),
    ]);
  }
}
