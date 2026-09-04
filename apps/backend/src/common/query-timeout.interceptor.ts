import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable, timeout, catchError } from 'rxjs';

@Injectable()
export class QueryTimeoutInterceptor implements NestInterceptor {
  private readonly TIMEOUT_MS = 30000; // 30 seconds

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      timeout(this.TIMEOUT_MS),
      catchError((err) => {
        if (err.name === 'TimeoutError') {
          throw new Error('Query timed out. Please try a simpler query or reduce the date range.');
        }
        throw err;
      }),
    );
  }
}
