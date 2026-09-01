import {
  CallHandler,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { catchError, tap, throwError } from 'rxjs';
import type { Observable } from 'rxjs';
import { ObservabilityService } from './observability.service';

@Injectable()
export class RequestMetricsInterceptor implements NestInterceptor {
  constructor(private readonly observability: ObservabilityService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const startedAt = performance.now();
    const record = (statusCode: number) =>
      this.observability.record({
        method: request.method,
        path: normalizePath(request.baseUrl + request.path),
        statusCode,
        durationMs: Math.max(1, Math.round(performance.now() - startedAt)),
      });

    return next.handle().pipe(
      tap(() => record(response.statusCode)),
      catchError((error: unknown) => {
        record(
          error instanceof HttpException
            ? error.getStatus()
            : HttpStatus.INTERNAL_SERVER_ERROR,
        );
        return throwError(() => error);
      }),
    );
  }
}

function normalizePath(path: string) {
  return path
    .replace(/\b[0-9a-f]{8}-[0-9a-f-]{27,}\b/gi, ':id')
    .replace(/\/[0-9]+(?=\/|$)/g, '/:id');
}
