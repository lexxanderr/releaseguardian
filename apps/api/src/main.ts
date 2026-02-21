import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // ✅ CORS — allow frontend dev servers (5173, 5174, 5175, etc.)
  app.enableCors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: false,
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'x-rg-role'],
});




  // Swagger
  const config = new DocumentBuilder()
    .setTitle('ReleaseGuardian API')
    .setDescription(
      'Demo API for release checks, evidence, decisions, and tamper-proof audit',
    )
    .setVersion('1.0')
    .addApiKey(
      { type: 'apiKey', name: 'x-rg-role', in: 'header' },
      'x-rg-role',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  await app.listen(3000);
}

bootstrap();
