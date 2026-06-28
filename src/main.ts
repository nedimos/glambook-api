import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe, Logger } from '@nestjs/common';
import * as path from 'path';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('GlamBook');
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Attach a lightweight language detector — uses `x-lang` header or Accept-Language
  app.use((req: any, _res: any, next: any) => {
    const header = (req.headers['x-lang'] || req.headers['accept-language'] || 'en').toString();
    const lang = header.split(',')[0].split('-')[0];
    req.locale = lang || 'en';
    next();
  });

  // ─── Global prefix ──────────────────────────────────────────────────────────
  const prefix = process.env.API_PREFIX || 'api/v1';
  app.setGlobalPrefix(prefix);

  // ─── CORS ──────────────────────────────────────────────────────────────────
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3001',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  });

  // ─── Validation ─────────────────────────────────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,           // strip unknown fields
      forbidNonWhitelisted: true,
      transform: true,           // auto-transform types
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // ─── Swagger / OpenAPI ──────────────────────────────────────────────────────
  const swaggerConfig = new DocumentBuilder()
    .setTitle('GlamBook API')
    .setDescription('Appointment booking platform for beauty salons')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('Auth', 'Authentication endpoints')
    .addTag('Salons', 'Salon browsing and management')
    .addTag('Appointments', 'Booking and scheduling')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: { persistAuthorization: true },
  });

  // ─── Start ──────────────────────────────────────────────────────────────────
  // Serve uploaded files
  app.useStaticAssets(path.join(process.cwd(), 'uploads'), { prefix: '/uploads' });
  const port = process.env.PORT || 3000;
  await app.listen(port);

  logger.log(`🚀 GlamBook API running on http://localhost:${port}/${prefix}`);
  logger.log(`📚 Swagger docs at http://localhost:${port}/docs`);
}

bootstrap();
