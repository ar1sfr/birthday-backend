import { Module } from '@nestjs/common';
import { BirthdayWorkerService } from './birthday-worker.service';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [UsersModule],
  providers: [BirthdayWorkerService],
})
export class BirthdayWorkerModule {}
