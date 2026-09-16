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

const SESSION_HEARTBEAT_LEASE_MS = 30_000;

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

  async balance(userId: string, isAdministrator = false) {
    const latestPurchase = await this.prisma.projectorProPurchase.findFirst({
      where: { userId, status: 'SUCCESS' },
      orderBy: { fulfilledAt: 'desc' },
      select: { fulfilledAt: true, packageCode: true },
    });
    if (isAdministrator)
      return {
        unlimited: true,
        seconds: null,
        minutes: null,
        lastPurchaseAt: latestPurchase?.fulfilledAt ?? null,
        lastPackageCode: latestPurchase?.packageCode ?? null,
      };
    const wallet = await this.prisma.projectorProWallet.findUnique({
      where: { userId },
    });
    // A wallet-less account has not started a trial yet. Once a wallet exists,
    // its persisted balance and trialGrantedAt are authoritative; never show a
    // fresh trial merely because the balance happens to be zero.
    if (!wallet)
      return {
        unlimited: false,
        seconds: 3600,
        minutes: 60,
        trialGranted: true,
        trialStartedAt: null,
        lastPurchaseAt: latestPurchase?.fulfilledAt ?? null,
        lastPackageCode: latestPurchase?.packageCode ?? null,
      };
    return {
      unlimited: false,
      seconds: wallet?.balanceSeconds ?? 0,
      minutes: Math.floor((wallet?.balanceSeconds ?? 0) / 60),
      trialGranted: Boolean(wallet?.trialGrantedAt),
      trialStartedAt: wallet?.trialGrantedAt ?? null,
      lastPurchaseAt: latestPurchase?.fulfilledAt ?? null,
      lastPackageCode: latestPurchase?.packageCode ?? null,
    };
  }

  async initializeCheckout(userId: string, packageCode: string) {
    const selected = DEFAULT_PACKAGES.find((item) => item.code === packageCode);
    if (!selected) throw new BadRequestException('Unknown credit package.');

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });
    if (!user) throw new BadRequestException('User account was not found.');
    const secret = process.env.PAYSTACK_SECRET_KEY;
    if (!secret)
      throw new InternalServerErrorException(
        'Payment service is not configured.',
      );

    const reference = `pp_${randomUUID().replaceAll('-', '')}`;
    const response = await fetch(
      'https://api.paystack.co/transaction/initialize',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${secret}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: user.email,
          amount: selected.amountKobo,
          currency: 'NGN',
          reference,
          metadata: {
            product: 'projectorpro',
            packageCode: selected.code,
            userId,
          },
        }),
      },
    );
    const result = (await response.json()) as {
      status?: boolean;
      message?: string;
      data?: { authorization_url?: string; reference?: string };
    };
    if (!response.ok || !result.status || !result.data?.authorization_url)
      throw new BadRequestException(
        result.message ?? 'Paystack checkout could not be initialized.',
      );

    await this.prisma.projectorProPurchase.create({
      data: {
        userId,
        packageCode: selected.code,
        amountKobo: selected.amountKobo,
        creditSeconds: selected.minutes * 60,
        paystackRef: reference,
        status: 'PENDING',
      },
    });
    return { authorizationUrl: result.data.authorization_url, reference };
  }

  async issueDeepgramToken(
    userId: string,
    installationId: string,
    deviceFingerprint: string,
    isAdministrator = false,
  ) {
    if (!installationId?.trim())
      throw new BadRequestException('installationId is required.');
    if (!deviceFingerprint?.trim())
      throw new BadRequestException('deviceFingerprint is required.');
    const reserveSeconds = 60;

    const deepgramKey = process.env.DEEPGRAM_API_KEY;
    if (!deepgramKey)
      throw new InternalServerErrorException(
        'Deepgram service is not configured.',
      );

    let insufficientBalance = false;
    const session = isAdministrator
      ? null
      : await this.prisma.$transaction(async (tx) => {
          const now = new Date();
          let reservationSeconds = reserveSeconds;
          const walletBeforeTrial = await tx.projectorProWallet.upsert({
            where: { userId },
            create: { userId, balanceSeconds: 0 },
            update: {},
          });
          // Serialize session creation/recovery with other token requests and
          // billing mutations for this user by taking a row lock on the wallet.
          await tx.projectorProWallet.updateMany({
            where: { id: walletBeforeTrial.id },
            data: { balanceSeconds: { increment: 0 } },
          });
          const currentWallet = await tx.projectorProWallet.findUniqueOrThrow({
            where: { userId },
          });
          const deviceAlreadyUsed = await tx.projectorProTrialDevice.findUnique(
            {
              where: { deviceId: deviceFingerprint.trim() },
              select: { id: true },
            },
          );
          if (!currentWallet.trialGrantedAt && !deviceAlreadyUsed) {
            const trial = await tx.projectorProWallet.updateMany({
              where: { id: currentWallet.id, trialGrantedAt: null },
              data: {
                balanceSeconds: { increment: 3600 },
                trialGrantedAt: now,
              },
            });
            if (trial.count === 1) {
              await tx.projectorProTrialDevice.create({
                data: { deviceId: deviceFingerprint.trim(), userId },
              });
              await tx.projectorProCreditEntry.create({
                data: {
                  walletId: currentWallet.id,
                  type: 'PURCHASE',
                  seconds: 3600,
                  reference: `trial:${userId}`,
                  description: 'One-time service trial',
                },
              });
            }
          }
          const activeSessions = await tx.projectorProSession.findMany({
            where: {
              userId,
              status: 'ACTIVE',
            },
            orderBy: { createdAt: 'desc' },
            select: {
              id: true,
              createdAt: true,
              lastHeartbeatAt: true,
              consumedSeconds: true,
              reservedSeconds: true,
            },
          });
          for (const activeSession of activeSessions) {
            // Older rows may not have a recorded heartbeat yet. Their last
            // metered point is the safest available lease timestamp.
            const lastConfirmedAt =
              activeSession.lastHeartbeatAt ??
              new Date(
                activeSession.createdAt.getTime() +
                  activeSession.consumedSeconds * 1000,
              );
            if (
              now.getTime() - lastConfirmedAt.getTime() <=
              SESSION_HEARTBEAT_LEASE_MS
            )
              throw new ForbiddenException(
                'A transcription session is already active for this account.',
              );

            const ended = await tx.projectorProSession.updateMany({
              where: { id: activeSession.id, userId, status: 'ACTIVE' },
              data: { status: 'COMPLETED', completedAt: now },
            });
            if (ended.count !== 1) continue;

            const refundSeconds = Math.max(
              0,
              activeSession.reservedSeconds - activeSession.consumedSeconds,
            );
            if (refundSeconds > 0) {
              await tx.projectorProWallet.update({
                where: { id: currentWallet.id },
                data: { balanceSeconds: { increment: refundSeconds } },
              });
              await tx.projectorProCreditEntry.create({
                data: {
                  walletId: currentWallet.id,
                  type: 'RELEASE',
                  seconds: refundSeconds,
                  reference: `release:${activeSession.id}`,
                  description: 'Unused reservation returned after stale session',
                },
              });
            }
          }
          const current = await tx.projectorProWallet.updateMany({
            where: { userId, balanceSeconds: { gte: reservationSeconds } },
            data: { balanceSeconds: { decrement: reservationSeconds } },
          });
          if (current.count !== 1) {
            // Commit stale-session cleanup even when the returned credits are
            // not enough to reserve a new session.
            insufficientBalance = true;
            return null;
          }
          const updatedWallet = await tx.projectorProWallet.findUniqueOrThrow({
            where: { userId },
          });
          const created = await tx.projectorProSession.create({
            data: {
              userId,
              installationId: installationId.trim(),
              reservedSeconds: reservationSeconds,
            },
          });
          await tx.projectorProCreditEntry.create({
            data: {
              walletId: updatedWallet.id,
              type: 'RESERVATION',
              seconds: -reservationSeconds,
              reference: `session:${created.id}`,
              description: 'Service session reservation',
            },
          });
          return created;
        });

    if (insufficientBalance)
      throw new ForbiddenException(
        'Purchase Deepgram credits to start transcription.',
      );

    const response = await fetch('https://api.deepgram.com/v1/auth/grant', {
      method: 'POST',
      headers: {
        Authorization: `Token ${deepgramKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ttl_seconds: 3600 }),
    });
    const responseBody = await response.text();
    let result: {
      access_token?: string;
      expires_in?: number;
      err_code?: string;
      err_msg?: string;
      message?: string;
    } = {};
    try {
      result = JSON.parse(responseBody) as typeof result;
    } catch {
      // Deepgram can return a non-JSON upstream error. Keep the client-safe
      // response below while retaining only a bounded diagnostic server-side.
    }
    if (!response.ok || !result.access_token) {
      this.logger.warn(
        `Deepgram temporary-token grant failed (${response.status}): ${
          result.err_msg ??
          result.message ??
          result.err_code ??
          'unrecognised upstream response'
        }`,
      );
      if (session) await this.releaseSession(session.id);
      throw new BadRequestException('Deepgram token could not be issued.');
    }
    return {
      token: result.access_token,
      sessionId: session?.id ?? null,
      expiresIn: result.expires_in ?? 3600,
    };
  }

  async completeSession(userId: string, sessionId: string) {
    if (!sessionId?.trim()) return { completed: false };
    const sessionKey = sessionId.trim();
    const result = await this.prisma.$transaction(async (tx) => {
      const walletBeforeLock = await tx.projectorProWallet.findUnique({
        where: { userId },
        select: { id: true },
      });
      if (walletBeforeLock) {
        await tx.projectorProWallet.updateMany({
          where: { id: walletBeforeLock.id },
          data: { balanceSeconds: { increment: 0 } },
        });
      }
      const session = await tx.projectorProSession.findFirst({
        where: { id: sessionKey, userId, status: 'ACTIVE' },
      });
      if (!session) return { completed: false, consumedSeconds: 0 };

      const now = new Date();
      const elapsedSeconds = Math.max(
        1,
        Math.ceil((now.getTime() - session.createdAt.getTime()) / 1000),
      );
      const alreadyBilledBeyondReservation = Math.max(
        0,
        session.consumedSeconds - session.reservedSeconds,
      );
      const additionalSeconds = Math.max(
        0,
        elapsedSeconds -
          session.reservedSeconds -
          alreadyBilledBeyondReservation,
      );
      const refundSeconds = Math.max(
        0,
        session.reservedSeconds - elapsedSeconds,
      );
      const wallet = await tx.projectorProWallet.findUnique({
        where: { userId },
      });
      if (!wallet) return { completed: false, consumedSeconds: 0 };
      if (additionalSeconds > 0) {
        const charged = await tx.projectorProWallet.updateMany({
          where: { id: wallet.id, balanceSeconds: { gte: additionalSeconds } },
          data: { balanceSeconds: { decrement: additionalSeconds } },
        });
        if (charged.count !== 1)
          throw new ForbiddenException(
            'Your transcription balance has been exhausted.',
          );
        await tx.projectorProCreditEntry.create({
          data: {
            walletId: wallet.id,
            type: 'CONSUMPTION',
            seconds: -additionalSeconds,
            reference: `consumption:${session.id}`,
            description: 'Actual service session time',
          },
        });
      }
      if (refundSeconds > 0) {
        await tx.projectorProWallet.update({
          where: { id: wallet.id },
          data: { balanceSeconds: { increment: refundSeconds } },
        });
        await tx.projectorProCreditEntry.create({
          data: {
            walletId: wallet.id,
            type: 'RELEASE',
            seconds: refundSeconds,
            reference: `release:${session.id}`,
            description: 'Unused session reservation returned',
          },
        });
      }
      await tx.projectorProSession.update({
        where: { id: session.id },
        data: {
          status: 'COMPLETED',
          consumedSeconds: elapsedSeconds,
          completedAt: now,
        },
      });
      return { completed: true, consumedSeconds: elapsedSeconds };
    });
    return result;
  }

  async heartbeatSession(userId: string, sessionId: string) {
    if (!sessionId?.trim()) return { active: false };
    const sessionKey = sessionId.trim();
    return this.prisma.$transaction(async (tx) => {
      const walletBeforeLock = await tx.projectorProWallet.findUnique({
        where: { userId },
        select: { id: true },
      });
      if (walletBeforeLock) {
        await tx.projectorProWallet.updateMany({
          where: { id: walletBeforeLock.id },
          data: { balanceSeconds: { increment: 0 } },
        });
      }
      const session = await tx.projectorProSession.findFirst({
        where: { id: sessionKey, userId, status: 'ACTIVE' },
      });
      if (!session) return { active: false };
      const now = new Date();
      const lastConfirmedAt =
        session.lastHeartbeatAt ??
        new Date(
          session.createdAt.getTime() + session.consumedSeconds * 1000,
        );
      if (
        now.getTime() - lastConfirmedAt.getTime() >
        SESSION_HEARTBEAT_LEASE_MS
      )
        return { active: false, stale: true };
      const elapsedSeconds = Math.max(
        1,
        Math.ceil((now.getTime() - session.createdAt.getTime()) / 1000),
      );
      const previousExtra = Math.max(
        0,
        session.consumedSeconds - session.reservedSeconds,
      );
      const currentExtra = Math.max(
        0,
        elapsedSeconds - session.reservedSeconds,
      );
      const additionalSeconds = Math.max(0, currentExtra - previousExtra);
      const wallet = await tx.projectorProWallet.findUnique({
        where: { userId },
      });
      if (!wallet)
        throw new ForbiddenException(
          'Your transcription balance is unavailable.',
        );
      if (additionalSeconds > 0) {
        const charged = await tx.projectorProWallet.updateMany({
          where: { id: wallet.id, balanceSeconds: { gte: additionalSeconds } },
          data: { balanceSeconds: { decrement: additionalSeconds } },
        });
        if (charged.count !== 1)
          throw new ForbiddenException(
            'Your transcription balance has been exhausted.',
          );
        await tx.projectorProCreditEntry.create({
          data: {
            walletId: wallet.id,
            type: 'CONSUMPTION',
            seconds: -additionalSeconds,
            reference: `consumption:${session.id}:${elapsedSeconds}`,
            description: 'Actual service session time',
          },
        });
      }
      if (elapsedSeconds > session.consumedSeconds)
        await tx.projectorProSession.updateMany({
          where: { id: session.id, userId, status: 'ACTIVE' },
          data: { consumedSeconds: elapsedSeconds, lastHeartbeatAt: now },
        });
      else
        await tx.projectorProSession.updateMany({
          where: { id: session.id, userId, status: 'ACTIVE' },
          data: { lastHeartbeatAt: now },
        });
      return {
        active: true,
        elapsedSeconds,
        balanceSeconds: wallet.balanceSeconds - additionalSeconds,
      };
    });
  }

  async processPaystackWebhook(
    signature: string,
    rawBody: Buffer | undefined,
    body: unknown,
  ) {
    const secret = process.env.PAYSTACK_SECRET_KEY;
    if (!secret || !signature || !rawBody)
      throw new ForbiddenException('Invalid payment webhook.');
    const expected = createHmac('sha512', secret).update(rawBody).digest('hex');
    const actual = Buffer.from(signature, 'utf8');
    const expectedBuffer = Buffer.from(expected, 'utf8');
    if (
      actual.length !== expectedBuffer.length ||
      !timingSafeEqual(actual, expectedBuffer)
    )
      throw new ForbiddenException('Invalid payment webhook.');

    const event = body as {
      event?: string;
      data?: {
        status?: string;
        reference?: string;
        metadata?: { userId?: string; packageCode?: string };
        amount?: number;
      };
    };
    if (event.event !== 'charge.success' || !event.data?.reference)
      return { received: true };
    const reference = event.data.reference;
    const purchase = await this.prisma.projectorProPurchase.findUnique({
      where: { paystackRef: reference },
    });
    if (!purchase || purchase.status === 'SUCCESS') return { received: true };
    if (event.data.status !== 'success') return { received: true };

    // Do not credit a wallet from the webhook body alone. Verify the
    // transaction directly with Paystack and match it to our pending order.
    const verification = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      {
        headers: { Authorization: `Bearer ${secret}` },
      },
    );
    const verified = (await verification.json()) as {
      status?: boolean;
      data?: {
        status?: string;
        reference?: string;
        amount?: number;
        currency?: string;
      };
    };
    const verifiedData = verified.data;
    if (
      !verification.ok ||
      !verified.status ||
      verifiedData?.status !== 'success' ||
      verifiedData.reference !== purchase.paystackRef ||
      verifiedData.amount !== purchase.amountKobo ||
      verifiedData.currency !== 'NGN'
    )
      throw new ForbiddenException('Payment could not be verified.');

    await this.prisma.$transaction(async (tx) => {
      const updated = await tx.projectorProPurchase.updateMany({
        where: { paystackRef: reference, status: 'PENDING' },
        data: { status: 'SUCCESS', fulfilledAt: new Date() },
      });
      if (updated.count !== 1) return;
      const wallet = await tx.projectorProWallet.upsert({
        where: { userId: purchase.userId },
        create: {
          userId: purchase.userId,
          balanceSeconds: purchase.creditSeconds,
        },
        update: { balanceSeconds: { increment: purchase.creditSeconds } },
      });
      await tx.projectorProCreditEntry.create({
        data: {
          walletId: wallet.id,
          type: 'PURCHASE',
          seconds: purchase.creditSeconds,
          reference: `purchase:${purchase.paystackRef}`,
          description: `${purchase.packageCode} Deepgram credits`,
          metadata: { paystackReference: purchase.paystackRef },
        },
      });
    });
    return { received: true };
  }

  private async releaseSession(sessionId: string) {
    await this.prisma.$transaction(async (tx) => {
      const session = await tx.projectorProSession.findUnique({
        where: { id: sessionId },
      });
      if (!session || session.status !== 'ACTIVE') return;
      const wallet = await tx.projectorProWallet.findUnique({
        where: { userId: session.userId },
      });
      if (!wallet) return;
      await tx.projectorProWallet.updateMany({
        where: { id: wallet.id },
        data: { balanceSeconds: { increment: 0 } },
      });
      const currentSession = await tx.projectorProSession.findFirst({
        where: { id: sessionId, status: 'ACTIVE' },
      });
      if (!currentSession) return;
      const ended = await tx.projectorProSession.updateMany({
        where: { id: sessionId, status: 'ACTIVE' },
        data: { status: 'EXPIRED', completedAt: new Date() },
      });
      if (ended.count !== 1) return;
      const refundSeconds = Math.max(
        0,
        currentSession.reservedSeconds - currentSession.consumedSeconds,
      );
      if (refundSeconds === 0) return;
      await tx.projectorProWallet.update({
        where: { id: wallet.id },
        data: { balanceSeconds: { increment: refundSeconds } },
      });
      await tx.projectorProCreditEntry.create({
        data: {
          walletId: wallet.id,
          type: 'RELEASE',
          seconds: refundSeconds,
          reference: `release:${sessionId}`,
          description: 'Released failed Deepgram session reservation',
        },
      });
    });
  }
}
