import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const allowedOrigins = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'https://releaseguardian.vercel.app',
  ];

  app.enableCors({
    origin: (origin, cb) => {
      // allow curl / Postman / server-to-server
      if (!origin) return cb(null, true);
      if (allowedOrigins.includes(origin)) return cb(null, true);
      return cb(new Error(`CORS blocked for origin: ${origin}`), false);
    },
    credentials: false,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'x-rg-role'],
  });

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

  const port = Number(process.env.PORT) || 3000;
  await app.listen(port, '0.0.0.0');

  console.log(`ReleaseGuardian API listening on http://0.0.0.0:${port}`);
}

bootstrap();