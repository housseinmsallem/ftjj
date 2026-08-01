import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    // Unexpected (non-HTTP) errors must be logged so they can be debugged.
    // In a default NestJS setup the framework logs these automatically; this
    // custom filter replaces that behaviour, so we log explicitly here.
    if (!(exception instanceof HttpException)) {
      console.error('\n===== UNEXPECTED ERROR =====');
      console.error(exception instanceof Error ? exception.stack : exception);
      console.error('==============================\n');
    }

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Une erreur interne est survenue';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exResponse = exception.getResponse();

      if (typeof exResponse === 'string') {
        message = exResponse;
      } else if (typeof exResponse === 'object' && exResponse !== null) {
        const resp = exResponse as any;
        // Preserve validation error details
        if (resp.errors) {
          return response.status(status).json({
            statusCode: status,
            message: resp.message || 'Erreur de validation',
            errors: resp.errors,
          });
        }
        message = resp.message || message;
      }
    }

    response.status(status).json({
      statusCode: status,
      message,
      timestamp: new Date().toISOString(),
    });
  }
}
