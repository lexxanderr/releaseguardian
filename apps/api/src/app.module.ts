import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ChecksModule } from './checks/checks.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [PrismaModule, ChecksModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
