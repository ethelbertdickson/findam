import { Injectable } from '@nestjs/common';

const MAX_SAMPLES = 1_000;
const MONITORING_WINDOW_MS = 5 * 60 * 1_000;

interface RequestSample {
  method: string;
  path: string;
  statusCode: number;
  durationMs: number;
  occurredAt: number;
}

@Injectable()
export class ObservabilityService {
  private readonly samples: RequestSample[] = [];

  record(sample: Omit<RequestSample, 'occurredAt'>) {
    this.samples.push({ ...sample, occurredAt: Date.now() });
    if (this.samples.length > MAX_SAMPLES) this.samples.shift();
  }

  getSnapshot() {
    const now = Date.now();
    const windowStart = now - MONITORING_WINDOW_MS;
    const samples = this.samples.filter(
      (sample) => sample.occurredAt >= windowStart,
    );
    const errors = samples.filter((sample) => sample.statusCode >= 400);
    const durations = samples
      .map((sample) => sample.durationMs)
      .sort((a, b) => a - b);
    const routes = new Map<
      string,
      {
        method: string;
        path: string;
        requests: number;
        errors: number;
        totalDurationMs: number;
      }
    >();

    for (const sample of samples) {
      const key = `${sample.method} ${sample.path}`;
      const route = routes.get(key) ?? {
        method: sample.method,
        path: sample.path,
        requests: 0,
        errors: 0,
        totalDurationMs: 0,
      };
      route.requests += 1;
      route.errors += sample.statusCode >= 400 ? 1 : 0;
      route.totalDurationMs += sample.durationMs;
      routes.set(key, route);
    }

    return {
      generatedAt: new Date(now),
      windowSeconds: MONITORING_WINDOW_MS / 1_000,
      processStartedAt: new Date(Date.now() - process.uptime() * 1_000),
      requests: samples.length,
      errors: errors.length,
      errorRatePercent: percentage(errors.length, samples.length),
      requestsPerMinute:
        Math.round((samples.length / (MONITORING_WINDOW_MS / 60_000)) * 10) /
        10,
      averageLatencyMs: average(durations),
      p95LatencyMs: percentile(durations, 0.95),
      statusCodes: samples.reduce<Record<string, number>>((counts, sample) => {
        const key = String(sample.statusCode);
        counts[key] = (counts[key] ?? 0) + 1;
        return counts;
      }, {}),
      routes: [...routes.values()]
        .map((route) => ({
          ...route,
          averageLatencyMs: Math.round(route.totalDurationMs / route.requests),
          errorRatePercent: percentage(route.errors, route.requests),
        }))
        .sort(
          (left, right) =>
            right.requests - left.requests || right.errors - left.errors,
        )
        .slice(0, 10),
      recentErrors: errors
        .slice(-10)
        .reverse()
        .map((sample) => ({
          method: sample.method,
          path: sample.path,
          statusCode: sample.statusCode,
          occurredAt: new Date(sample.occurredAt),
        })),
    };
  }
}

function average(values: number[]) {
  if (!values.length) return 0;
  return Math.round(
    values.reduce((total, value) => total + value, 0) / values.length,
  );
}

function percentile(values: number[], percentileValue: number) {
  if (!values.length) return 0;
  return values[
    Math.min(values.length - 1, Math.ceil(values.length * percentileValue) - 1)
  ];
}

function percentage(part: number, total: number) {
  if (!total) return 0;
  return Math.round((part / total) * 10_000) / 100;
}
