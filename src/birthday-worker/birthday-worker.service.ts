import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { UsersService } from '../users/users.service';

@Injectable()
export class BirthdayWorkerService {
  private readonly logger = new Logger(BirthdayWorkerService.name);

  constructor(private readonly usersService: UsersService) {}

  // Run every hour to check for birthdays
  @Cron(CronExpression.EVERY_HOUR)
  async checkBirthdays() {
    this.logger.log('Checking for birthdays...');

    try {
      // Get all users with birthdays today
      const birthdayUsers =
        await this.usersService.findUsersWithBirthdayToday();

      // Process each user
      for (const user of birthdayUsers) {
        await this.processBirthdayMessage(user);
      }

      this.logger.log(`Processed ${birthdayUsers.length} birthday messages`);
    } catch (error) {
      this.logger.error(
        `Error checking birthdays: ${error.message}`,
        error.stack,
      );
    }
  }

  private async processBirthdayMessage(user: any) {
    try {
      // Get current hour in user's timezone
      const now = new Date();
      const userDate = new Date(
        now.toLocaleString('en-US', { timeZone: user.timezone }),
      );
      const userHour = userDate.getHours();

      // Send message only at 9 AM in user's timezone
      if (userHour === 9) {
        this.logger.log(
          `Sending birthday message to ${user.name} (${user.email})`,
        );
        await this.sendBirthdayMessage(user);
      }
    } catch (error) {
      this.logger.error(
        `Error processing birthday for user ${user.name} (${user.email}): ${error.message}`,
        error.stack,
      );
    }
  }

  private async sendBirthdayMessage(user: any) {
    // In a real application, this would send an email or notification
    // For this example, we'll just log the message
    this.logger.log(`🎂 Happy Birthday, ${user.name}! 🎉`);

    // Simulate async operation like sending an email
    return new Promise((resolve) => setTimeout(resolve, 100));
  }
}
