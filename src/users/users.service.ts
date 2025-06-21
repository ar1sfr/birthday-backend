import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

// Interface for database update operations
interface UserUpdateData {
  name?: string;
  email?: string;
  birthday?: Date;
  timezone?: string;
}

// Pagination response interface
export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    nextPage: number | null;
    previousPage: number | null;
  };
}

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    try {
      // Validate timezone
      this.validateTimezone(createUserDto.timezone);

      // Create new user
      const newUser = new this.userModel({
        ...createUserDto,
        birthday: new Date(createUserDto.birthday),
      });

      return await newUser.save();
    } catch (error: unknown) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        (error as { code: number }).code === 11000
      ) {
        // Duplicate key error
        throw new BadRequestException('Email already exists');
      }
      throw error;
    }
  }

  async findAll(page = 1, limit = 10): Promise<PaginatedResponse<User>> {
    // Ensure page and limit are valid numbers
    const currentPage = Math.max(1, page);
    const itemsPerPage = Math.max(1, Math.min(100, limit)); // Limit maximum items per page to 100

    // Calculate skip value for pagination
    const skip = (currentPage - 1) * itemsPerPage;

    // Execute query with pagination
    const data = await this.userModel
      .find()
      .skip(skip)
      .sort({ createdAt: -1 })
      .limit(itemsPerPage)
      .exec();

    // Get total count for pagination metadata
    const total = await this.userModel.countDocuments();

    // Calculate pagination metadata
    const totalPages = Math.ceil(total / itemsPerPage);
    const hasNextPage = currentPage < totalPages;
    const hasPreviousPage = currentPage > 1;

    return {
      data,
      meta: {
        total,
        page: currentPage,
        limit: itemsPerPage,
        totalPages,
        hasNextPage,
        hasPreviousPage,
        nextPage: hasNextPage ? currentPage + 1 : null,
        previousPage: hasPreviousPage ? currentPage - 1 : null,
      },
    };
  }

  async findOne(id: string): Promise<User> {
    const user = await this.userModel.findById(id).exec();
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return user;
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    try {
      // Validate timezone if provided
      if (updateUserDto.timezone) {
        this.validateTimezone(updateUserDto.timezone);
      }

      // Create a modified data object for database update
      const updateData: UserUpdateData = {};

      // Copy properties from DTO to update data object
      if (updateUserDto.name) updateData.name = updateUserDto.name;
      if (updateUserDto.email) updateData.email = updateUserDto.email;
      if (updateUserDto.timezone) updateData.timezone = updateUserDto.timezone;

      // Convert birthday to Date object if provided
      if (updateUserDto.birthday) {
        updateData.birthday = new Date(updateUserDto.birthday);
      }

      const updatedUser = await this.userModel
        .findByIdAndUpdate(id, updateData, { new: true })
        .exec();

      if (!updatedUser) {
        throw new NotFoundException(`User with ID ${id} not found`);
      }

      return updatedUser;
    } catch (error: unknown) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        (error as { code: number }).code === 11000
      ) {
        // Duplicate key error
        throw new BadRequestException('Email already exists');
      }
      throw error;
    }
  }

  async remove(id: string): Promise<void> {
    const result = await this.userModel.deleteOne({ _id: id }).exec();
    if (result.deletedCount === 0) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
  }

  // Helper method to validate timezone
  private validateTimezone(timezone: string): void {
    try {
      // Check if timezone is valid by attempting to create a date with it
      Intl.DateTimeFormat(undefined, { timeZone: timezone });
    } catch (error) {
      // We don't need the error details, just throw a BadRequestException
      throw new BadRequestException(`${error} - Invalid timezone: ${timezone}`);
    }
  }

  // Method to find users with birthdays today in their timezone
  async findUsersWithBirthdayToday(): Promise<User[]> {
    // Get current date
    const now = new Date();

    // Define the type for aggregation result
    interface BirthdayAggregationResult {
      _id: string;
      name: string;
      email: string;
      birthday: Date;
      timezone: string;
      birthdayMonth: number;
      birthdayDay: number;
    }

    // Create an aggregation pipeline to find users with birthdays today
    // This avoids loading all users into memory
    const users = await this.userModel
      .aggregate<BirthdayAggregationResult>([
        {
          $addFields: {
            // Extract month and day from birthday for comparison
            birthdayMonth: { $month: '$birthday' },
            birthdayDay: { $dayOfMonth: '$birthday' },
            // Store timezone for later processing
            userTimezone: '$timezone',
          },
        },
        {
          $match: {
            // Initial filter to reduce the dataset to users with birthdays in recent days
            // This is an optimization to reduce the number of timezone calculations needed
            $or: [
              // Today in UTC (handles most cases)
              {
                birthdayMonth: now.getMonth() + 1, // MongoDB months are 1-12
                birthdayDay: now.getDate(),
              },
              // Yesterday in UTC (handles timezone differences)
              {
                birthdayMonth:
                  new Date(now.getTime() - 86400000).getMonth() + 1,
                birthdayDay: new Date(now.getTime() - 86400000).getDate(),
              },
              // Tomorrow in UTC (handles timezone differences)
              {
                birthdayMonth:
                  new Date(now.getTime() + 86400000).getMonth() + 1,
                birthdayDay: new Date(now.getTime() + 86400000).getDate(),
              },
            ],
          },
        },
      ])
      .exec();

    // Final filtering based on timezone
    // This is still needed because MongoDB doesn't support timezone-aware date operations
    return users.filter((user) => {
      try {
        // Get current date in user's timezone
        const userDate = new Date(
          now.toLocaleString('en-US', { timeZone: user.timezone }),
        );

        // Check if today is the user's birthday (ignoring year)
        return (
          userDate.getMonth() + 1 === user.birthdayMonth && // Adjust for MongoDB months
          userDate.getDate() === user.birthdayDay
        );
      } catch (error: unknown) {
        // Log error but don't fail the entire operation
        console.error(
          `Error processing birthday for user ${user._id}: ${(error as Error).message}`,
        );
        return false;
      }
    });
  }
}
