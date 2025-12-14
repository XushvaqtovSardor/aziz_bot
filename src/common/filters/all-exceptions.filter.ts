import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : exception instanceof Error
          ? exception.message
          : 'Internal server error';

    // Log the error with details
    this.logger.error(
      `❌ Exception occurred: ${request.method} ${request.url}`,
    );
    this.logger.error(`Status: ${status}`);
    this.logger.error(`Message: ${JSON.stringify(message)}`);

    if (exception instanceof Error) {
      this.logger.error(`Stack trace:`, exception.stack);
    }

    // Log user info if available
    if (request.user) {
      this.logger.error(`User: ${JSON.stringify(request.user)}`);
    }

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message,
    });
  }
}
