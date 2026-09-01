import {
  OperationalTaskName,
  OperationalTaskStatus,
  Role,
} from '@prisma/client';
import { ObservabilityService } from '../../observability/observability.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AdminOperationsService } from './admin-operations.service';

describe('AdminOperationsService', () => {
  const prisma = {
    $queryRaw: jest.fn(),
    operationalTaskRun: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
  };
  const observability = new ObservabilityService();
  const service = new AdminOperationsService(
    prisma as unknown as PrismaService,
    observability,
  );
  const actor = {
    sub: 'admin-1',
    email: 'admin@findam.test',
    role: Role.ADMIN,
  };

  beforeEach(() => jest.clearAllMocks());

  it('returns live monitoring metrics with a database dependency check', async () => {
    observability.record({
      method: 'GET',
      path: '/api/v1/health',
      statusCode: 200,
      durationMs: 5,
    });
    prisma.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);

    const result = await service.getMonitoring();

    expect(result.requests).toBeGreaterThan(0);
    expect(result.dependencies.database.status).toBe('healthy');
    expect(result.dependencies.database.latencyMs).toBeGreaterThan(0);
  });

  it('records a successful database health-check run', async () => {
    prisma.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);
    prisma.operationalTaskRun.create.mockResolvedValue({ id: 'run-1' });

    await expect(service.runDatabaseHealthCheck(actor)).resolves.toEqual({
      id: 'run-1',
    });
    const calls = prisma.operationalTaskRun.create.mock
      .calls as unknown as Array<
      [
        {
          data: {
            task: OperationalTaskName;
            status: OperationalTaskStatus;
            actorId: string;
          };
        },
      ]
    >;
    const data = calls[0]?.[0].data;
    expect(data?.task).toBe(OperationalTaskName.DATABASE_HEALTH_CHECK);
    expect(data?.status).toBe(OperationalTaskStatus.SUCCEEDED);
    expect(data?.actorId).toBe(actor.sub);
  });
});
