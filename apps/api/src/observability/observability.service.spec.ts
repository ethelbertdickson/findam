import { ObservabilityService } from './observability.service';

describe('ObservabilityService', () => {
  it('aggregates routes, errors, and latency from recorded requests', () => {
    const service = new ObservabilityService();
    service.record({
      method: 'GET',
      path: '/api/v1/listings',
      statusCode: 200,
      durationMs: 12,
    });
    service.record({
      method: 'GET',
      path: '/api/v1/listings',
      statusCode: 500,
      durationMs: 30,
    });

    const snapshot = service.getSnapshot();

    expect(snapshot.requests).toBe(2);
    expect(snapshot.errors).toBe(1);
    expect(snapshot.errorRatePercent).toBe(50);
    expect(snapshot.averageLatencyMs).toBe(21);
    expect(snapshot.p95LatencyMs).toBe(30);
    expect(snapshot.routes).toEqual([
      expect.objectContaining({
        method: 'GET',
        path: '/api/v1/listings',
        requests: 2,
        errors: 1,
      }),
    ]);
    expect(snapshot.recentErrors[0]).toEqual(
      expect.objectContaining({ statusCode: 500 }),
    );
  });
});
