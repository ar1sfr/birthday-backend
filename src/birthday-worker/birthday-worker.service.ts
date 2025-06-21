import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { UsersService } from '../users/users.service';
import { User } from '../users/schemas/user.schema';

@Injectable()
export class BirthdayWorkerService {
  private readonly logger = new Logger(BirthdayWorkerService.name);

  constructor(private readonly usersService: UsersService) {}

  // Run every hour to check for birthdays
  @Cron(CronExpression.EVERY_HOUR)
  async checkBirthdays() {
    this.logger.log('Checking for birthdays...');

    try {
      // Get all users with birthdays today using the optimized database query
      const birthdayUsers =
        await this.usersService.findUsersWithBirthdayToday();

      if (birthdayUsers.length === 0) {
        this.logger.log('No birthdays to process at this time');
        return;
      }

      this.logger.log(
        `Found ${birthdayUsers.length} users with birthdays today`,
      );

      // Process each user independently to ensure one failure doesn't affect others
      const results = await Promise.allSettled(
        birthdayUsers.map((user) => this.processBirthdayMessage(user)),
      );

      // Log summary of results
      const successful = results.filter((r) => r.status === 'fulfilled').length;
      const failed = results.filter((r) => r.status === 'rejected').length;

      this.logger.log(
        `Birthday processing complete: ${successful} successful, ${failed} failed`,
      );

      // If there were failures, log them at the warning level
      if (failed > 0) {
        this.logger.warn(`${failed} birthday messages failed to process`);
      }
    } catch (error: unknown) {
      this.logger.error(
        `Error checking birthdays: ${(error as Error).message}`,
        (error as Error).stack,
      );
    }
  }

  private async processBirthdayMessage(user: User): Promise<void> {
    this.logger.log(`Processing birthday message for ${user.name}`);

    try {
      // Use the retry mechanism instead of direct send
      await this.sendBirthdayMessageWithRetry(user);

      this.logger.log(`Successfully sent birthday message to ${user.name}`);
    } catch (error: unknown) {
      this.logger.error(
        `Failed to process birthday message for ${user.name}: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw error; // Re-throw to be caught by Promise.allSettled
    }
  }

  // Retry mechanism for sending birthday messages
  private async sendBirthdayMessageWithRetry(
    user: User,
    maxRetries = 5,
    baseDelay = 1000,
  ): Promise<void> {
    let retries = 0;

    while (retries <= maxRetries) {
      try {
        await this.sendBirthdayMessage(user);
        // If successful, log and return
        if (retries > 0) {
          this.logger.log(
            `Successfully sent birthday message to ${user.name} after ${retries} retries`,
          );
        }
        return;
      } catch (error: unknown) {
        retries++;

        // If we've reached max retries, log and throw
        if (retries > maxRetries) {
          this.logger.error(
            `Failed to send birthday message to ${user.name} after ${maxRetries} retries: ${(error as Error).message}`,
          );
          throw error;
        }

        // Calculate delay with exponential backoff and jitter
        const delay = Math.floor(
          baseDelay * Math.pow(2, retries - 1) * (0.5 + Math.random() * 0.5),
        );

        this.logger.warn(
          `Retry ${retries}/${maxRetries} for ${user.name} after ${delay}ms: ${(error as Error).message}`,
        );

        // Wait before retrying
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  private async sendBirthdayMessage(user: User): Promise<void> {
    // Simulate sending a birthday message with occasional random failures for testing
    // In a real application, this would call an email or messaging service

    // Simulate random failures (20% chance) to test retry mechanism
    if (Math.random() < 0.2) {
      throw new Error('Simulated random failure in message sending');
    }

    // Simulate API call delay
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Log success (in a real app, we would send an actual message)
    this.logger.log(
      `SIMULATED: Sent birthday message to ${user.name} (${user.email})`,
    );
  }
}
