import { NestFactory } from '@nestjs/core';
import { ValidationError, ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Response } from 'express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { BadRequestException } from '@nestjs/common';
import {
  BadRequestExceptionFilter,
  ConflictExceptionFilter,
  ForbiddenExceptionFilter,
  NotFoundExceptionFilter,
  UnauthorizedExceptionFilter,
} from './core/exceptions/exception.filters';
import config from './core/config';
import { AppModule } from './app.module';
import { ErrorItem, StandardMultipleErrorsResponse } from './dto/standard';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  const swaggerConfig = new DocumentBuilder()
    .setTitle(config.app.appName)
    .setVersion(config.app.versionName)
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs/api', app, document);
  app.getHttpAdapter().get('docs/api-json', (req, res: Response) => {
    res.json(document);
  });

  app.enableCors({
    origin: config.app.allowedOrigins.length ? config.app.allowedOrigins : true,
    methods: 'GET, HEAD, PUT, POST, DELETE, OPTIONS, PATCH',
    credentials: true,
    allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      exceptionFactory: (validationErrors: ValidationError[] = []) => {
        return new BadRequestException({
          success: false,
          errorList: validationErrors.map(
            (e) =>
              ({
                id: e.property,
                error: e.constraints,
              }) as ErrorItem,
          ),
        } as StandardMultipleErrorsResponse);
      },
    }),
  );

  app.setGlobalPrefix(`/api/${config.app.versionName}`);
  app.useGlobalFilters(new UnauthorizedExceptionFilter());
  app.useGlobalFilters(new NotFoundExceptionFilter());
  app.useGlobalFilters(new ForbiddenExceptionFilter());
  app.useGlobalFilters(new BadRequestExceptionFilter());
  app.useGlobalFilters(new ConflictExceptionFilter());

  await app.listen(config.app.listenPort);
}
bootstrap();
