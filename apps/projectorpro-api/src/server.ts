import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import bcrypt from 'bcrypt';
import jwt, { type JwtPayload } from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import { PrismaClient } from '@prisma/client';

const port = Number(process.env.PROJECTORPRO_API_PORT ?? 3500);
const upstream = (process.env.LEGACY_PROJECTORPRO_API_URL ?? 'https://api.grastadomhan.com/api/v1')
  .replace(/\/api\/v1\/?$/, '')
  .replace(/\/$/, '');
const gatewayKey = process.env.PROJECTORPRO_API_KEY;
const prisma = process.env.PROJECTORPRO_DATABASE_URL ? new PrismaClient() : null;
const accessSecret = process.env.JWT_ACCESS_SECRET;
const refreshSecret = process.env.JWT_REFRESH_SECRET;
const googleClientId = process.env.PROJECTORPRO_GOOGLE_CLIENT_ID;
const googleClient = new OAuth2Client();

const projectorPaths = [
  '/api/v1/auth/login',
  '/api/v1/auth/refresh',
  '/api/v1/auth/logout',
  '/api/v1/auth/me',
  '/api/v1/auth/register/request-code',
  '/api/v1/auth/register/confirm-code',
  '/api/v1/auth/google/desktop/config',
  '/api/v1/auth/google/desktop',
  '/api/v1/auth/google/web/config',
  '/api/v1/auth/google/web',
  '/api/v1/projectorpro/',
];

const openApi = {
  openapi: '3.0.3',
  info: {
    title: 'Projector Pro API',
    version: '0.1.0',
    description: 'Dedicated Projector Pro API boundary. Core auth and credit reads are database-backed; remaining routes are compatibility-forwarded during migration.',
  },
  servers: [{ url: '/api/v1' }],
  paths: {
    '/auth/login': { post: { summary: 'Sign in to Projector Pro' } },
    '/auth/refresh': { post: { summary: 'Refresh Projector Pro session' } },
    '/auth/google/desktop/config': { get: { summary: 'Get desktop Google OAuth configuration' } },
    '/auth/google/desktop': { post: { summary: 'Exchange desktop Google OAuth code' } },
    '/auth/google/web/config': { get: { summary: 'Get Google Identity Services configuration' } },
    '/auth/google/web': { post: { summary: 'Sign in with a Google Identity Services credential' } },
    '/projectorpro/credits/packages': { get: { summary: 'List credit packages' } },
    '/projectorpro/credits/balance': { get: { summary: 'Get credit balance' } },
    '/projectorpro/account': { get: { summary: 'Get account, credit breakdown, and purchase history' } },
    '/projectorpro/credits/checkout': { post: { summary: 'Create credit checkout' } },
    '/projectorpro/deepgram/token': { post: { summary: 'Create Deepgram token' } },
    '/projectorpro/deepgram/session/complete': { post: { summary: 'Complete Deepgram session' } },
    '/projectorpro/deepgram/session/heartbeat': { post: { summary: 'Heartbeat Deepgram session' } },
    '/projectorpro/payments/paystack/webhook': { post: { summary: 'Process Paystack webhook' } },
  },
};

const server = createServer(async (request, response) => {
  setJsonHeaders(response);
  if (request.method === 'GET' && request.url === '/health') {
    send(response, 200, { status: 'ok', product: 'projectorpro', mode: prisma ? 'database-backed-compatibility-gateway' : 'compatibility-gateway' });
    return;
  }
  if (request.method === 'GET' && request.url === '/api/v1/docs-json') {
    send(response, 200, openApi);
    return;
  }
  if (request.method === 'GET' && request.url === '/api/v1/docs') {
    response.setHeader('content-type', 'text/html; charset=utf-8');
    response.end('<!doctype html><title>Projector Pro API</title><h1>Projector Pro API</h1><p><a href="/api/v1/docs-json">OpenAPI JSON</a></p>');
    return;
  }
  if (!request.url || !projectorPaths.some((path) => request.url!.startsWith(path))) {
    send(response, 404, { error: 'not_found', product: 'projectorpro' });
    return;
  }
  if (gatewayKey && request.headers['x-projectorpro-api-key'] !== gatewayKey) {
    send(response, 401, { error: 'unauthorized' });
    return;
  }
  if (prisma && await handleLocalRoute(request, response)) return;
  await forward(request, response);
});

server.listen(port, '127.0.0.1', () => console.log(`Projector Pro API listening on http://127.0.0.1:${port}`));

async function forward(request: IncomingMessage, response: ServerResponse) {
  const body = request.method === 'GET' || request.method === 'HEAD' ? undefined : await readBody(request);
  const headers = new Headers();
  for (const [name, value] of Object.entries(request.headers)) {
    if (name === 'host' || name === 'content-length' || name === 'x-projectorpro-api-key') continue;
    if (typeof value === 'string') headers.set(name, value);
  }
  const upstreamResponse = await fetch(`${upstream}${request.url}`, {
    method: request.method,
    headers,
    body: body ? body.toString('utf8') : undefined,
    signal: AbortSignal.timeout(15_000),
  });
  response.statusCode = upstreamResponse.status;
  const contentType = upstreamResponse.headers.get('content-type');
  if (contentType) response.setHeader('content-type', contentType);
  const responseBody = Buffer.from(await upstreamResponse.arrayBuffer());
  if (request.method === 'POST' && request.url?.startsWith('/api/v1/auth/google/desktop') && upstreamResponse.ok) {
    await synchronizeGoogleAccount(responseBody);
  }
  response.end(responseBody);
}

async function synchronizeGoogleAccount(responseBody: Buffer) {
  if (!prisma) return;
  try {
    const result = JSON.parse(responseBody.toString('utf8')) as {
      user?: { id?: string; email?: string; firstName?: string; lastName?: string; role?: string };
    };
    const incoming = result.user;
    if (!incoming?.id || !incoming.email) return;
    const existing = await prisma.user.findUnique({ where: { id: incoming.id } }) ??
      await prisma.user.findUnique({ where: { email: incoming.email.toLowerCase() } });
    const user = existing ?? await prisma.user.create({
      data: {
        id: incoming.id,
        email: incoming.email.toLowerCase(),
        firstName: incoming.firstName || 'Projector',
        lastName: incoming.lastName || 'User',
        role: incoming.role === 'ADMIN' ? 'ADMIN' : incoming.role === 'AGENT' ? 'AGENT' : 'USER',
      },
    });
    const wallet = await prisma.projectorProWallet.findUnique({ where: { userId: user.id } });
    if (!wallet) {
      await prisma.$transaction(async (tx) => {
        const created = await tx.projectorProWallet.create({ data: { userId: user.id, balanceSeconds: 3600, trialGrantedAt: new Date() } });
        await tx.projectorProCreditEntry.create({ data: { walletId: created.id, type: 'PURCHASE', seconds: 3600, reference: `trial:${user.id}`, description: 'One-time Projector Pro free trial' } });
      });
    } else if (!wallet.trialGrantedAt) {
      await prisma.$transaction(async (tx) => {
        const updated = await tx.projectorProWallet.updateMany({ where: { id: wallet.id, trialGrantedAt: null }, data: { balanceSeconds: { increment: 3600 }, trialGrantedAt: new Date() } });
        if (updated.count === 1) {
          await tx.projectorProCreditEntry.create({ data: { walletId: wallet.id, type: 'PURCHASE', seconds: 3600, reference: `trial:${user.id}`, description: 'One-time Projector Pro free trial' } }).catch(() => undefined);
        }
      });
    }
  } catch (error) {
    console.error('Projector Pro Google account synchronization failed', error);
  }
}

async function handleLocalRoute(request: IncomingMessage, response: ServerResponse): Promise<boolean> {
  const pathname = new URL(request.url ?? '/', 'http://projectorpro.local').pathname;
  if (pathname === '/api/v1/auth/google/web/config' && request.method === 'GET') {
    if (!googleClientId) { send(response, 503, { message: 'Google sign-in is not configured' }); return true; }
    send(response, 200, { clientId: googleClientId });
    return true;
  }
  if (pathname === '/api/v1/auth/google/web' && request.method === 'POST') {
    if (!googleClientId) { send(response, 503, { message: 'Google sign-in is not configured' }); return true; }
    const body = await readJson(request);
    const credential = String(body.credential ?? '');
    if (!credential) { send(response, 400, { message: 'Google credential is required' }); return true; }
    try {
      const ticket = await googleClient.verifyIdToken({ idToken: credential, audience: googleClientId });
      const payload = ticket.getPayload();
      if (!payload?.sub || !payload.email || !payload.email_verified) throw new ServiceError(401, 'Google account could not be verified');
      const email = payload.email.toLowerCase();
      let user = await prisma!.user.findUnique({ where: { email } });
      if (user?.googleId && user.googleId !== payload.sub) throw new ServiceError(409, 'This email is linked to another Google account');
      user = user
        ? await prisma!.user.update({ where: { id: user.id }, data: { googleId: payload.sub, avatarUrl: payload.picture ?? user.avatarUrl } })
        : await prisma!.user.create({ data: { email, googleId: payload.sub, firstName: payload.given_name || 'Projector', lastName: payload.family_name || 'User', avatarUrl: payload.picture } });
      await ensureTrialWallet(user.id);
      send(response, 200, { ...(await issueTokens(user.id, user.email, user.role)), user: publicUser(user) });
    } catch (error) { sendServiceError(response, error); }
    return true;
  }
  if (pathname === '/api/v1/auth/login' && request.method === 'POST') {
    const body = await readJson(request);
    const email = String(body.email ?? '').trim().toLowerCase();
    const password = String(body.password ?? '');
    const user = await prisma!.user.findUnique({ where: { email } });
    if (!user || !user.passwordHash || !(await bcrypt.compare(password, user.passwordHash))) {
      send(response, 401, { message: 'Invalid email or password' });
      return true;
    }
    if (!user.isActive) {
      send(response, 401, { message: 'This account has been deactivated' });
      return true;
    }
    send(response, 200, { ...(await issueTokens(user.id, user.email, user.role)), user: publicUser(user) });
    return true;
  }
  if (pathname === '/api/v1/auth/refresh' && request.method === 'POST') {
    const body = await readJson(request);
    const refreshToken = String(body.refreshToken ?? '');
    const payload = verifyRefresh(refreshToken);
    if (!payload?.sub || !payload.jti) {
      send(response, 401, { message: 'Invalid refresh token' });
      return true;
    }
    const stored = await prisma!.refreshToken.findUnique({ where: { id: payload.jti } });
    if (!stored || stored.userId !== payload.sub || stored.revokedAt || stored.expiresAt < new Date() || !(await bcrypt.compare(refreshToken, stored.tokenHash))) {
      send(response, 401, { message: 'Invalid refresh token' });
      return true;
    }
    await prisma!.refreshToken.update({ where: { id: stored.id }, data: { revokedAt: new Date() } });
    const user = await prisma!.user.findUnique({ where: { id: stored.userId } });
    if (!user || !user.isActive) {
      send(response, 401, { message: 'This account has been deactivated' });
      return true;
    }
    send(response, 200, await issueTokens(user.id, user.email, user.role));
    return true;
  }
  if (pathname === '/api/v1/auth/logout' && request.method === 'POST') {
    const body = await readJson(request);
    const payload = verifyRefresh(String(body.refreshToken ?? ''));
    if (payload?.jti) await prisma!.refreshToken.updateMany({ where: { id: payload.jti, revokedAt: null }, data: { revokedAt: new Date() } });
    response.statusCode = 204;
    response.end();
    return true;
  }
  if (pathname === '/api/v1/auth/me' && request.method === 'GET') {
    const user = await authenticatedUser(request);
    if (!user) { send(response, 401, { message: 'Unauthorized' }); return true; }
    send(response, 200, publicUser(user));
    return true;
  }
  if (pathname === '/api/v1/projectorpro/credits/packages' && request.method === 'GET') {
    send(response, 200, [
      { code: 'starter', amountKobo: 100000, minutes: 60, currency: 'NGN', seconds: 3600 },
      { code: 'standard', amountKobo: 250000, minutes: 180, currency: 'NGN', seconds: 10800 },
      { code: 'worship', amountKobo: 500000, minutes: 420, currency: 'NGN', seconds: 25200 },
    ]);
    return true;
  }
  if (pathname === '/api/v1/projectorpro/credits/balance' && request.method === 'GET') {
    const user = await authenticatedUser(request);
    if (!user) { send(response, 401, { message: 'Unauthorized' }); return true; }
    const purchase = await prisma!.projectorProPurchase.findFirst({ where: { userId: user.id, status: 'SUCCESS' }, orderBy: { fulfilledAt: 'desc' }, select: { fulfilledAt: true, packageCode: true } });
    if (user.role === 'ADMIN') { send(response, 200, { unlimited: true, seconds: null, minutes: null, lastPurchaseAt: purchase?.fulfilledAt ?? null, lastPackageCode: purchase?.packageCode ?? null }); return true; }
    const wallet = await prisma!.projectorProWallet.findUnique({ where: { userId: user.id } });
    const seconds = wallet?.balanceSeconds ?? (wallet ? 0 : 3600);
    send(response, 200, { unlimited: false, seconds, minutes: Math.floor(seconds / 60), trialGranted: Boolean(wallet?.trialGrantedAt) || !wallet, trialStartedAt: wallet?.trialGrantedAt ?? null, lastPurchaseAt: purchase?.fulfilledAt ?? null, lastPackageCode: purchase?.packageCode ?? null });
    return true;
  }
  if (pathname === '/api/v1/projectorpro/account' && request.method === 'GET') {
    const user = await authenticatedUser(request);
    if (!user) { send(response, 401, { message: 'Unauthorized' }); return true; }
    try { send(response, 200, await accountSummary(user.id)); } catch (error) { sendServiceError(response, error); }
    return true;
  }
  if (pathname === '/api/v1/projectorpro/credits/checkout' && request.method === 'POST') {
    const user = await authenticatedUser(request);
    if (!user) { send(response, 401, { message: 'Unauthorized' }); return true; }
    try {
      const body = await readJson(request);
      send(response, 200, await initializeCheckout(user.id, String(body.packageCode ?? '')));
    } catch (error) { sendServiceError(response, error); }
    return true;
  }
  if (pathname === '/api/v1/projectorpro/deepgram/token' && request.method === 'POST') {
    const user = await authenticatedUser(request);
    if (!user) { send(response, 401, { message: 'Unauthorized' }); return true; }
    try {
      const body = await readJson(request);
      send(response, 200, await issueDeepgramToken(user.id, user.role === 'ADMIN', String(body.installationId ?? ''), String(body.deviceFingerprint ?? '')));
    } catch (error) { sendServiceError(response, error); }
    return true;
  }
  if (pathname === '/api/v1/projectorpro/deepgram/session/heartbeat' && request.method === 'POST') {
    const user = await authenticatedUser(request);
    if (!user) { send(response, 401, { message: 'Unauthorized' }); return true; }
    try { const body = await readJson(request); send(response, 200, await heartbeatSession(user.id, String(body.sessionId ?? ''))); } catch (error) { sendServiceError(response, error); }
    return true;
  }
  if (pathname === '/api/v1/projectorpro/deepgram/session/complete' && request.method === 'POST') {
    const user = await authenticatedUser(request);
    if (!user) { send(response, 401, { message: 'Unauthorized' }); return true; }
    try { const body = await readJson(request); send(response, 200, await completeSession(user.id, String(body.sessionId ?? ''))); } catch (error) { sendServiceError(response, error); }
    return true;
  }
  if (pathname === '/api/v1/projectorpro/payments/paystack/webhook' && request.method === 'POST') {
    try {
      const rawBody = await readBody(request);
      send(response, 200, await processPaystackWebhook(String(request.headers['x-paystack-signature'] ?? ''), rawBody, JSON.parse(rawBody.toString('utf8'))));
    } catch (error) { sendServiceError(response, error); }
    return true;
  }
  return false;
}

async function ensureTrialWallet(userId: string) {
  const wallet = await prisma!.projectorProWallet.findUnique({ where: { userId } });
  if (!wallet) {
    await prisma!.$transaction(async (tx) => {
      const created = await tx.projectorProWallet.create({ data: { userId, balanceSeconds: 3600, trialGrantedAt: new Date() } });
      await tx.projectorProCreditEntry.create({ data: { walletId: created.id, type: 'PURCHASE', seconds: 3600, reference: `trial:${userId}`, description: 'One-time Projector Pro free trial' } });
    });
  } else if (!wallet.trialGrantedAt) {
    await prisma!.$transaction(async (tx) => {
      const updated = await tx.projectorProWallet.updateMany({ where: { id: wallet.id, trialGrantedAt: null }, data: { balanceSeconds: { increment: 3600 }, trialGrantedAt: new Date() } });
      if (updated.count === 1) await tx.projectorProCreditEntry.create({ data: { walletId: wallet.id, type: 'PURCHASE', seconds: 3600, reference: `trial:${userId}`, description: 'One-time Projector Pro free trial' } }).catch(() => undefined);
    });
  }
}

const CREDIT_PACKAGES = [
  { code: 'starter', amountKobo: 100_000, minutes: 60 },
  { code: 'standard', amountKobo: 250_000, minutes: 180 },
  { code: 'worship', amountKobo: 500_000, minutes: 420 },
];

async function accountSummary(userId: string) {
  const user = await prisma!.user.findUnique({ where: { id: userId } });
  if (!user) throw new ServiceError(404, 'User account was not found.');
  const wallet = await prisma!.projectorProWallet.findUnique({ where: { userId } });
  const entries = wallet ? await prisma!.projectorProCreditEntry.findMany({ where: { walletId: wallet.id }, orderBy: { createdAt: 'desc' } }) : [];
  const purchases = await prisma!.projectorProPurchase.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, select: { packageCode: true, amountKobo: true, creditSeconds: true, paystackRef: true, status: true, createdAt: true, fulfilledAt: true } });
  const trialGrantedSeconds = entries.filter((entry) => entry.reference === `trial:${userId}`).reduce((total, entry) => total + Math.max(0, entry.seconds), 0);
  const purchasedGrantedSeconds = purchases.filter((purchase) => purchase.status === 'SUCCESS').reduce((total, purchase) => total + purchase.creditSeconds, 0);
  const usageNet = Math.max(0, -entries.filter((entry) => entry.reference !== `trial:${userId}` && !entry.reference?.startsWith('purchase:')).reduce((total, entry) => total + entry.seconds, 0));
  const trialUsedSeconds = Math.min(trialGrantedSeconds, usageNet);
  const purchasedUsedSeconds = Math.min(purchasedGrantedSeconds, Math.max(0, usageNet - trialGrantedSeconds));
  const totalSeconds = Math.max(0, wallet?.balanceSeconds ?? trialGrantedSeconds + purchasedGrantedSeconds - usageNet);
  return {
    user: publicUser(user),
    credits: {
      trial: { grantedSeconds: trialGrantedSeconds, usedSeconds: trialUsedSeconds, remainingSeconds: Math.max(0, trialGrantedSeconds - trialUsedSeconds) },
      purchased: { grantedSeconds: purchasedGrantedSeconds, usedSeconds: purchasedUsedSeconds, remainingSeconds: Math.max(0, purchasedGrantedSeconds - purchasedUsedSeconds) },
      totalSeconds,
    },
    purchases,
  };
}

async function initializeCheckout(userId: string, packageCode: string) {
  const selected = CREDIT_PACKAGES.find((item) => item.code === packageCode);
  if (!selected) throw new ServiceError(400, 'Unknown credit package.');
  const user = await prisma!.user.findUnique({ where: { id: userId }, select: { email: true } });
  if (!user) throw new ServiceError(400, 'User account was not found.');
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) throw new ServiceError(500, 'Payment service is not configured.');
  const reference = `pp_${randomUUID().replaceAll('-', '')}`;
  const upstreamResponse = await fetch('https://api.paystack.co/transaction/initialize', {
    method: 'POST', headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: user.email, amount: selected.amountKobo, currency: 'NGN', reference, metadata: { product: 'projectorpro', packageCode: selected.code, userId } }),
    signal: AbortSignal.timeout(15_000),
  });
  const result = await upstreamResponse.json().catch(() => ({})) as { status?: boolean; message?: string; data?: { authorization_url?: string } };
  if (!upstreamResponse.ok || !result.status || !result.data?.authorization_url) throw new ServiceError(400, result.message ?? 'Paystack checkout could not be initialized.');
  await prisma!.projectorProPurchase.create({ data: { userId, packageCode: selected.code, amountKobo: selected.amountKobo, creditSeconds: selected.minutes * 60, paystackRef: reference, status: 'PENDING' } });
  return { authorizationUrl: result.data.authorization_url, reference };
}

async function processPaystackWebhook(signature: string, rawBody: Buffer, body: unknown) {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret || !signature || !rawBody.length) throw new ServiceError(403, 'Invalid payment webhook.');
  const expected = createHmac('sha512', secret).update(rawBody).digest('hex');
  const actual = Buffer.from(signature, 'utf8');
  const expectedBuffer = Buffer.from(expected, 'utf8');
  if (actual.length !== expectedBuffer.length || !timingSafeEqual(actual, expectedBuffer)) throw new ServiceError(403, 'Invalid payment webhook.');
  const event = body as { event?: string; data?: { status?: string; reference?: string } };
  if (event.event !== 'charge.success' || !event.data?.reference || event.data.status !== 'success') return { received: true };
  const purchase = await prisma!.projectorProPurchase.findUnique({ where: { paystackRef: event.data.reference } });
  if (!purchase || purchase.status === 'SUCCESS') return { received: true };
  const verification = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(purchase.paystackRef)}`, { headers: { Authorization: `Bearer ${secret}` }, signal: AbortSignal.timeout(15_000) });
  const verified = await verification.json().catch(() => ({})) as { status?: boolean; data?: { status?: string; reference?: string; amount?: number; currency?: string } };
  const data = verified.data;
  if (!verification.ok || !verified.status || data?.status !== 'success' || data.reference !== purchase.paystackRef || data.amount !== purchase.amountKobo || data.currency !== 'NGN') throw new ServiceError(403, 'Payment could not be verified.');
  await prisma!.$transaction(async (tx) => {
    const updated = await tx.projectorProPurchase.updateMany({ where: { paystackRef: purchase.paystackRef, status: 'PENDING' }, data: { status: 'SUCCESS', fulfilledAt: new Date() } });
    if (updated.count !== 1) return;
    const wallet = await tx.projectorProWallet.upsert({ where: { userId: purchase.userId }, create: { userId: purchase.userId, balanceSeconds: purchase.creditSeconds }, update: { balanceSeconds: { increment: purchase.creditSeconds } } });
    await tx.projectorProCreditEntry.create({ data: { walletId: wallet.id, type: 'PURCHASE', seconds: purchase.creditSeconds, reference: `purchase:${purchase.paystackRef}`, description: `${purchase.packageCode} Deepgram credits`, metadata: { paystackReference: purchase.paystackRef } } });
  });
  return { received: true };
}

const SESSION_LEASE_MS = 30_000;

async function issueDeepgramToken(userId: string, isAdministrator: boolean, installationId: string, deviceFingerprint: string) {
  if (!installationId.trim()) throw new ServiceError(400, 'installationId is required.');
  if (!deviceFingerprint.trim()) throw new ServiceError(400, 'deviceFingerprint is required.');
  const deepgramKey = process.env.DEEPGRAM_API_KEY;
  if (!deepgramKey) throw new ServiceError(500, 'Deepgram service is not configured.');
  let insufficientBalance = false;
  const session = isAdministrator ? null : await prisma!.$transaction(async (tx) => {
    const now = new Date();
    const walletBeforeTrial = await tx.projectorProWallet.upsert({ where: { userId }, create: { userId, balanceSeconds: 0 }, update: {} });
    await tx.projectorProWallet.updateMany({ where: { id: walletBeforeTrial.id }, data: { balanceSeconds: { increment: 0 } } });
    const wallet = await tx.projectorProWallet.findUniqueOrThrow({ where: { userId } });
    const device = await tx.projectorProTrialDevice.findUnique({ where: { deviceId: deviceFingerprint.trim() } });
    if (!wallet.trialGrantedAt && !device) {
      const trial = await tx.projectorProWallet.updateMany({ where: { id: wallet.id, trialGrantedAt: null }, data: { balanceSeconds: { increment: 3600 }, trialGrantedAt: now } });
      if (trial.count === 1) {
        await tx.projectorProTrialDevice.create({ data: { deviceId: deviceFingerprint.trim(), userId } });
        await tx.projectorProCreditEntry.create({ data: { walletId: wallet.id, type: 'PURCHASE', seconds: 3600, reference: `trial:${userId}`, description: 'One-time Projector Pro free trial' } }).catch(() => undefined);
      }
    }
    const active = await tx.projectorProSession.findMany({ where: { userId, status: 'ACTIVE' }, orderBy: { createdAt: 'desc' } });
    for (const item of active) {
      const lastConfirmed = item.lastHeartbeatAt ?? new Date(item.createdAt.getTime() + item.consumedSeconds * 1000);
      if (now.getTime() - lastConfirmed.getTime() <= SESSION_LEASE_MS) throw new ServiceError(403, 'A transcription session is already active for this account.');
      const ended = await tx.projectorProSession.updateMany({ where: { id: item.id, userId, status: 'ACTIVE' }, data: { status: 'COMPLETED', completedAt: now } });
      if (ended.count !== 1) continue;
      const refund = Math.max(0, item.reservedSeconds - item.consumedSeconds);
      if (refund > 0) {
        await tx.projectorProWallet.update({ where: { id: wallet.id }, data: { balanceSeconds: { increment: refund } } });
        await tx.projectorProCreditEntry.create({ data: { walletId: wallet.id, type: 'RELEASE', seconds: refund, reference: `release:${item.id}`, description: 'Unused reservation returned after stale session' } }).catch(() => undefined);
      }
    }
    const charged = await tx.projectorProWallet.updateMany({ where: { userId, balanceSeconds: { gte: 60 } }, data: { balanceSeconds: { decrement: 60 } } });
    if (charged.count !== 1) { insufficientBalance = true; return null; }
    const created = await tx.projectorProSession.create({ data: { userId, installationId: installationId.trim(), reservedSeconds: 60 } });
    const current = await tx.projectorProWallet.findUniqueOrThrow({ where: { userId } });
    await tx.projectorProCreditEntry.create({ data: { walletId: current.id, type: 'RESERVATION', seconds: -60, reference: `session:${created.id}`, description: 'Deepgram session reservation' } });
    return created;
  });
  if (insufficientBalance) throw new ServiceError(403, 'Purchase Deepgram credits to start transcription.');
  const upstreamResponse = await fetch('https://api.deepgram.com/v1/auth/grant', { method: 'POST', headers: { Authorization: `Token ${deepgramKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ ttl_seconds: 3600 }), signal: AbortSignal.timeout(15_000) });
  const body = await upstreamResponse.json().catch(() => ({})) as { access_token?: string; expires_in?: number };
  if (!upstreamResponse.ok || !body.access_token) {
    if (session) await releaseSession(session.id);
    throw new ServiceError(400, 'Deepgram token could not be issued.');
  }
  return { token: body.access_token, sessionId: session?.id ?? null, expiresIn: body.expires_in ?? 3600 };
}

async function releaseSession(sessionId: string) {
  await prisma!.$transaction(async (tx) => {
    const session = await tx.projectorProSession.findUnique({ where: { id: sessionId } });
    if (!session || session.status !== 'ACTIVE') return;
    const wallet = await tx.projectorProWallet.findUnique({ where: { userId: session.userId } });
    if (!wallet) return;
    const refund = Math.max(0, session.reservedSeconds - session.consumedSeconds);
    if (refund > 0) {
      await tx.projectorProWallet.update({ where: { id: wallet.id }, data: { balanceSeconds: { increment: refund } } });
      await tx.projectorProCreditEntry.create({ data: { walletId: wallet.id, type: 'RELEASE', seconds: refund, reference: `release:${session.id}`, description: 'Reservation returned after token issue failure' } }).catch(() => undefined);
    }
    await tx.projectorProSession.update({ where: { id: session.id }, data: { status: 'COMPLETED', completedAt: new Date() } });
  });
}

async function heartbeatSession(userId: string, sessionId: string) {
  if (!sessionId.trim()) return { active: false };
  return prisma!.$transaction(async (tx) => {
    const session = await tx.projectorProSession.findFirst({ where: { id: sessionId.trim(), userId, status: 'ACTIVE' } });
    if (!session) return { active: false };
    const now = new Date();
    const lastConfirmed = session.lastHeartbeatAt ?? new Date(session.createdAt.getTime() + session.consumedSeconds * 1000);
    if (now.getTime() - lastConfirmed.getTime() > SESSION_LEASE_MS) return { active: false, stale: true };
    const elapsed = Math.max(1, Math.ceil((now.getTime() - session.createdAt.getTime()) / 1000));
    const previousExtra = Math.max(0, session.consumedSeconds - session.reservedSeconds);
    const currentExtra = Math.max(0, elapsed - session.reservedSeconds);
    const additional = Math.max(0, currentExtra - previousExtra);
    const wallet = await tx.projectorProWallet.findUnique({ where: { userId } });
    if (!wallet) throw new ServiceError(403, 'Your transcription balance is unavailable.');
    if (additional > 0) {
      const charged = await tx.projectorProWallet.updateMany({ where: { id: wallet.id, balanceSeconds: { gte: additional } }, data: { balanceSeconds: { decrement: additional } } });
      if (charged.count !== 1) throw new ServiceError(403, 'Your transcription balance has been exhausted.');
      await tx.projectorProCreditEntry.create({ data: { walletId: wallet.id, type: 'CONSUMPTION', seconds: -additional, reference: `consumption:${session.id}:${elapsed}`, description: 'Actual Deepgram session time' } });
    }
    await tx.projectorProSession.update({ where: { id: session.id }, data: { consumedSeconds: Math.max(session.consumedSeconds, elapsed), lastHeartbeatAt: now } });
    return { active: true, elapsedSeconds: elapsed, balanceSeconds: wallet.balanceSeconds - additional };
  });
}

async function completeSession(userId: string, sessionId: string) {
  if (!sessionId.trim()) return { completed: false };
  return prisma!.$transaction(async (tx) => {
    const session = await tx.projectorProSession.findFirst({ where: { id: sessionId.trim(), userId, status: 'ACTIVE' } });
    if (!session) return { completed: false, consumedSeconds: 0 };
    const now = new Date();
    const elapsed = Math.max(1, Math.ceil((now.getTime() - session.createdAt.getTime()) / 1000));
    const alreadyExtra = Math.max(0, session.consumedSeconds - session.reservedSeconds);
    const additional = Math.max(0, elapsed - session.reservedSeconds - alreadyExtra);
    const refund = Math.max(0, session.reservedSeconds - elapsed);
    const wallet = await tx.projectorProWallet.findUnique({ where: { userId } });
    if (!wallet) return { completed: false, consumedSeconds: 0 };
    if (additional > 0) {
      const charged = await tx.projectorProWallet.updateMany({ where: { id: wallet.id, balanceSeconds: { gte: additional } }, data: { balanceSeconds: { decrement: additional } } });
      if (charged.count !== 1) throw new ServiceError(403, 'Your transcription balance has been exhausted.');
      await tx.projectorProCreditEntry.create({ data: { walletId: wallet.id, type: 'CONSUMPTION', seconds: -additional, reference: `consumption:${session.id}`, description: 'Actual Deepgram session time' } }).catch(() => undefined);
    }
    if (refund > 0) {
      await tx.projectorProWallet.update({ where: { id: wallet.id }, data: { balanceSeconds: { increment: refund } } });
      await tx.projectorProCreditEntry.create({ data: { walletId: wallet.id, type: 'RELEASE', seconds: refund, reference: `release:${session.id}`, description: 'Unused Deepgram reservation returned' } }).catch(() => undefined);
    }
    await tx.projectorProSession.update({ where: { id: session.id }, data: { status: 'COMPLETED', consumedSeconds: elapsed, completedAt: now } });
    return { completed: true, consumedSeconds: elapsed };
  });
}

class ServiceError extends Error { constructor(public readonly status: number, message: string) { super(message); } }

function sendServiceError(response: ServerResponse, error: unknown) {
  if (error instanceof ServiceError) { send(response, error.status, { message: error.message }); return; }
  console.error('Projector Pro service error', error);
  send(response, 500, { message: 'Projector Pro service error' });
}

async function authenticatedUser(request: IncomingMessage) {
  if (!accessSecret) return null;
  const value = request.headers.authorization;
  if (!value?.startsWith('Bearer ')) return null;
  try {
    const payload = jwt.verify(value.slice(7), accessSecret) as JwtPayload & { sub?: string };
    return payload.sub ? await prisma!.user.findUnique({ where: { id: payload.sub } }) : null;
  } catch { return null; }
}

async function issueTokens(userId: string, email: string, role: string) {
  if (!accessSecret || !refreshSecret) throw new Error('JWT secrets are not configured');
  const accessToken = jwt.sign({ sub: userId, email, role }, accessSecret, { expiresIn: durationSeconds(process.env.JWT_ACCESS_EXPIRES_IN ?? '15m') });
  const record = await prisma!.refreshToken.create({ data: { userId, tokenHash: '', expiresAt: new Date(Date.now() + durationSeconds(process.env.JWT_REFRESH_EXPIRES_IN ?? '30d') * 1000) } });
  const refreshToken = jwt.sign({ sub: userId, jti: record.id }, refreshSecret, { expiresIn: durationSeconds(process.env.JWT_REFRESH_EXPIRES_IN ?? '30d') });
  await prisma!.refreshToken.update({ where: { id: record.id }, data: { tokenHash: await bcrypt.hash(refreshToken, 12) } });
  return { accessToken, refreshToken };
}

function verifyRefresh(token: string) {
  if (!refreshSecret || !token) return null;
  try { return jwt.verify(token, refreshSecret) as JwtPayload & { sub?: string; jti?: string }; } catch { return null; }
}

function publicUser(user: any) {
  const { passwordHash: _passwordHash, googleId: _googleId, avatarMediaId: _avatarMediaId, ...safe } = user;
  return safe;
}

function durationSeconds(value: string) {
  const match = /^(\\d+(?:\\.\\d+)?)(ms|s|m|h|d)?$/.exec(value.trim());
  if (!match) return 900;
  const amount = Number(match[1]);
  return Math.max(1, Math.round(amount * ({ ms: 0.001, s: 1, m: 60, h: 3600, d: 86400 }[match[2] ?? 's'] ?? 1)));
}

async function readBody(request: IncomingMessage): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  return Buffer.concat(chunks);
}

async function readJson(request: IncomingMessage): Promise<Record<string, unknown>> {
  const body = await readBody(request);
  try { return JSON.parse(body.toString('utf8')) as Record<string, unknown>; } catch { return {}; }
}

function setJsonHeaders(response: ServerResponse) {
  response.setHeader('cache-control', 'no-store');
  response.setHeader('x-product-api', 'projectorpro');
}

function send(response: ServerResponse, status: number, body: unknown) {
  response.statusCode = status;
  response.setHeader('content-type', 'application/json; charset=utf-8');
  response.end(JSON.stringify(body));
}
