import { ForbiddenException } from '@nestjs/common';
import { ProjectorProService } from './projectorpro.service';

function createHarness(seed: {
  balanceSeconds: number;
  session?: Record<string, any>;
}) {
  const wallet = {
    id: 'wallet-1',
    userId: 'user-1',
    balanceSeconds: seed.balanceSeconds,
    trialGrantedAt: new Date('2026-09-01T00:00:00.000Z'),
  };
  const sessions = seed.session ? [{ ...seed.session }] : [];
  const entries: Record<string, any>[] = [];
  let createdSessions = 0;

  const tx = {
    projectorProWallet: {
      upsert: jest.fn(async () => wallet),
      findUniqueOrThrow: jest.fn(async () => wallet),
      findUnique: jest.fn(async () => wallet),
      updateMany: jest.fn(async ({ where, data }: any) => {
        if (where.id && where.id !== wallet.id) return { count: 0 };
        if (
          where.balanceSeconds?.gte !== undefined &&
          wallet.balanceSeconds < where.balanceSeconds.gte
        )
          return { count: 0 };
        if (
          where.trialGrantedAt === null &&
          wallet.trialGrantedAt !== null
        )
          return { count: 0 };
        wallet.balanceSeconds += data.balanceSeconds?.increment ?? 0;
        wallet.balanceSeconds -= data.balanceSeconds?.decrement ?? 0;
        if (data.trialGrantedAt) wallet.trialGrantedAt = data.trialGrantedAt;
        return { count: 1 };
      }),
      update: jest.fn(async ({ data }: any) => {
        wallet.balanceSeconds += data.balanceSeconds?.increment ?? 0;
        return wallet;
      }),
    },
    projectorProTrialDevice: {
      findUnique: jest.fn(async () => null),
      create: jest.fn(async () => ({})),
    },
    projectorProSession: {
      findFirst: jest.fn(async ({ where }: any) =>
        sessions.find(
          (session) =>
            session.id === where.id &&
            session.userId === where.userId &&
            session.status === where.status,
        ) ?? null,
      ),
      findMany: jest.fn(async () =>
        sessions
          .filter((session) => session.status === 'ACTIVE')
          .map((session) => ({ ...session })),
      ),
      updateMany: jest.fn(async ({ where, data }: any) => {
        const session = sessions.find(
          (item) => item.id === where.id && item.status === where.status,
        );
        if (!session) return { count: 0 };
        Object.assign(session, data);
        return { count: 1 };
      }),
      create: jest.fn(async ({ data }: any) => {
        createdSessions += 1;
        const session = {
          id: `new-session-${createdSessions}`,
          ...data,
          consumedSeconds: 0,
          status: 'ACTIVE',
          createdAt: new Date(),
          lastHeartbeatAt: null,
          completedAt: null,
        };
        sessions.push(session);
        return session;
      }),
    },
    projectorProCreditEntry: {
      create: jest.fn(async ({ data }: any) => {
        entries.push(data);
        return data;
      }),
    },
  };

  // Model the wallet-row lock used by the service: transactions for one user
  // execute in order, just as PostgreSQL serializes updates to that wallet.
  let tail = Promise.resolve();
  const prisma = {
    projectorProWallet: {
      findUnique: jest.fn(async () => wallet),
    },
    $transaction: jest.fn(async (callback: (client: typeof tx) => unknown) => {
      let unlock!: () => void;
      const turn = new Promise<void>((resolve) => (unlock = resolve));
      const previous = tail;
      tail = tail.then(() => turn);
      await previous;
      try {
        return await callback(tx);
      } finally {
        unlock();
      }
    }),
  };

  return { service: new ProjectorProService(prisma as any), wallet, sessions, entries, tx };
}

describe('ProjectorProService stale session recovery', () => {
  const previousKey = process.env.DEEPGRAM_API_KEY;

  beforeAll(() => {
    process.env.DEEPGRAM_API_KEY = 'test-key';
  });

  afterAll(() => {
    if (previousKey === undefined) delete process.env.DEEPGRAM_API_KEY;
    else process.env.DEEPGRAM_API_KEY = previousKey;
  });

  beforeEach(() => {
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ access_token: 'temporary-token' }),
    } as Response);
  });

  afterEach(() => jest.restoreAllMocks());

  const requestToken = (service: ProjectorProService) =>
    service.issueDeepgramToken('user-1', 'install-1', 'device-1');

  it('keeps blocking a session with a heartbeat inside the 30-second lease', async () => {
    const now = Date.now();
    const { service, tx } = createHarness({
      balanceSeconds: 3000,
      session: {
        id: 'live-session',
        userId: 'user-1',
        reservedSeconds: 60,
        consumedSeconds: 80,
        status: 'ACTIVE',
        createdAt: new Date(now - 90_000),
        lastHeartbeatAt: new Date(now - 5_000),
      },
    });

    await expect(requestToken(service)).rejects.toBeInstanceOf(ForbiddenException);
    expect(tx.projectorProSession.create).not.toHaveBeenCalled();
  });

  it('does not revive or bill a heartbeat that arrives after the lease expired', async () => {
    const now = Date.now();
    const { service, wallet, sessions, entries } = createHarness({
      balanceSeconds: 3000,
      session: {
        id: 'stale-session',
        userId: 'user-1',
        reservedSeconds: 60,
        consumedSeconds: 25,
        status: 'ACTIVE',
        createdAt: new Date(now - 120_000),
        lastHeartbeatAt: new Date(now - 31_000),
      },
    });

    await expect(
      service.heartbeatSession('user-1', 'stale-session'),
    ).resolves.toEqual({ active: false, stale: true });
    expect(wallet.balanceSeconds).toBe(3000);
    expect(sessions[0].consumedSeconds).toBe(25);
    expect(entries).toHaveLength(0);
  });

  it('reconciles a stale session, preserves confirmed usage, refunds only unused reserve, and starts the next session', async () => {
    const now = Date.now();
    const { service, wallet, sessions, entries } = createHarness({
      balanceSeconds: 25,
      session: {
        id: 'stale-session',
        userId: 'user-1',
        reservedSeconds: 60,
        consumedSeconds: 25,
        status: 'ACTIVE',
        createdAt: new Date(now - 120_000),
        lastHeartbeatAt: new Date(now - 31_000),
        completedAt: null,
      },
    });

    const result = await requestToken(service);

    expect(result.sessionId).toBe('new-session-1');
    expect(sessions[0]).toMatchObject({
      status: 'COMPLETED',
      consumedSeconds: 25,
    });
    expect(sessions[0].completedAt).toBeInstanceOf(Date);
    expect(wallet.balanceSeconds).toBe(0); // 25 + 35 released - 60 reserved
    expect(entries).toContainEqual(
      expect.objectContaining({
        type: 'RELEASE',
        seconds: 35,
        reference: 'release:stale-session',
      }),
    );
    expect(entries).toContainEqual(
      expect.objectContaining({ type: 'RESERVATION', seconds: -60 }),
    );
  });

  it('commits stale cleanup even when the remaining balance cannot reserve a new session', async () => {
    const now = Date.now();
    const { service, wallet, sessions, entries } = createHarness({
      balanceSeconds: 0,
      session: {
        id: 'stale-session',
        userId: 'user-1',
        reservedSeconds: 60,
        consumedSeconds: 50,
        status: 'ACTIVE',
        createdAt: new Date(now - 120_000),
        lastHeartbeatAt: new Date(now - 31_000),
        completedAt: null,
      },
    });

    await expect(requestToken(service)).rejects.toBeInstanceOf(ForbiddenException);
    expect(sessions[0]).toMatchObject({ status: 'COMPLETED', consumedSeconds: 50 });
    expect(wallet.balanceSeconds).toBe(10);
    expect(entries).toContainEqual(
      expect.objectContaining({ type: 'RELEASE', seconds: 10 }),
    );
  });

  it('reconciles and refunds only once across concurrent token requests', async () => {
    const now = Date.now();
    const { service, wallet, sessions, entries } = createHarness({
      balanceSeconds: 25,
      session: {
        id: 'stale-session',
        userId: 'user-1',
        reservedSeconds: 60,
        consumedSeconds: 25,
        status: 'ACTIVE',
        createdAt: new Date(now - 120_000),
        lastHeartbeatAt: new Date(now - 31_000),
        completedAt: null,
      },
    });

    const results = await Promise.allSettled([
      requestToken(service),
      requestToken(service),
    ]);

    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter((result) => result.status === 'rejected')).toHaveLength(1);
    expect(sessions.filter((session) => session.status === 'ACTIVE')).toHaveLength(1);
    expect(entries.filter((entry) => entry.reference === 'release:stale-session')).toHaveLength(1);
    expect(wallet.balanceSeconds).toBe(0);
  });
});
