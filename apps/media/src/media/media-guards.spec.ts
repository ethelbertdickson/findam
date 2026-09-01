import { ExecutionContext, ForbiddenException, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { AdminMediaGuard } from "./admin-media.guard";
import { MediaCsrfGuard } from "./media-csrf.guard";
import { hashApiKey } from "./media.service";
import { ProjectApiKeyGuard } from "./project-api-key.guard";

function contextFor(request: object) {
  return {
    switchToHttp: () => ({ getRequest: () => request }),
  } as ExecutionContext;
}

describe("media administration guards", () => {
  const jwt = new JwtService();
  const secret = "media-guard-test-secret";
  const previousSecret = process.env.JWT_ACCESS_SECRET;

  beforeAll(() => {
    process.env.JWT_ACCESS_SECRET = secret;
  });

  afterAll(() => {
    if (previousSecret === undefined) delete process.env.JWT_ACCESS_SECRET;
    else process.env.JWT_ACCESS_SECRET = previousSecret;
  });

  it("accepts an administrator bearer token", async () => {
    const token = await jwt.signAsync(
      { sub: "admin-id", email: "admin@findam.test", role: "ADMIN" },
      { secret },
    );
    const request = { headers: { authorization: `Bearer ${token}` } };

    await expect(new AdminMediaGuard(jwt).canActivate(contextFor(request))).resolves.toBe(true);
    expect(request).toHaveProperty("user.role", "ADMIN");
  });

  it("rejects a non-administrator token", async () => {
    const token = await jwt.signAsync(
      { sub: "user-id", email: "user@findam.test", role: "USER" },
      { secret },
    );

    await expect(
      new AdminMediaGuard(jwt).canActivate(
        contextFor({ headers: { authorization: `Bearer ${token}` } }),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("accepts matching CSRF cookie and header values", () => {
    const guard = new MediaCsrfGuard();
    const context = contextFor({
      cookies: { findam_admin_csrf: "matching-token" },
      headers: { "x-csrf-token": "matching-token" },
    });

    expect(guard.canActivate(context)).toBe(true);
  });

  it("rejects a mismatched CSRF value", () => {
    const guard = new MediaCsrfGuard();
    const context = contextFor({
      cookies: { findam_admin_csrf: "cookie-token" },
      headers: { "x-csrf-token": "header-token" },
    });

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });
});

describe("project API key guard", () => {
  const project = {
    id: "project-id",
    name: "Findam",
    slug: "findam",
    description: null,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  it("accepts a key only for its project and updates last-used time", async () => {
    const key = "fdm_findam_test-secret";
    const findFirst = jest.fn().mockResolvedValue({ id: "key-id", project });
    const update = jest.fn().mockResolvedValue({});
    const guard = new ProjectApiKeyGuard({
      mediaApiKey: { findFirst, update },
    } as never);
    const request = {
      headers: { authorization: `Bearer ${key}` },
      params: { projectSlug: "findam" },
    };

    await expect(guard.canActivate(contextFor(request))).resolves.toBe(true);
    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ keyHash: hashApiKey(key) }),
      }),
    );
    expect(update).toHaveBeenCalled();
    expect(request).toHaveProperty("mediaProject.slug", "findam");
  });

  it("rejects an unknown or revoked project key", async () => {
    const guard = new ProjectApiKeyGuard({
      mediaApiKey: {
        findFirst: jest.fn().mockResolvedValue(null),
        update: jest.fn(),
      },
    } as never);

    await expect(
      guard.canActivate(
        contextFor({
          headers: { authorization: "Bearer revoked-key" },
          params: { projectSlug: "findam" },
        }),
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
