import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { BirthdayWorkerModule } from './birthday-worker/birthday-worker.module';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    
    // MongoDB Connection
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_URI') || 'mongodb://localhost:27017/birthday-app',
      }),
    }),
    
    // Scheduling
    ScheduleModule.forRoot(),
    
    // Feature Modules
    UsersModule,
    BirthdayWorkerModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
