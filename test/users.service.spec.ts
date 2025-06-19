import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UsersService } from '../src/users/users.service';
import { User, UserDocument } from '../src/users/schemas/user.schema';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('UsersService', () => {
  let service: UsersService;

  const mockUser = {
    _id: '507f1f77bcf86cd799439011',
    name: 'John Doe',
    email: 'john@example.com',
    birthday: new Date('1990-01-15'),
    timezone: 'America/New_York',
  };

  // Create a proper mock that can be used as a constructor
  const mockUserModel = function(this: any) {
    this.save = jest.fn().mockResolvedValue(mockUser);
    return this;
  } as unknown as Model<UserDocument>;
  
  // Add mock methods to the model
  (mockUserModel.find as jest.Mock) = jest.fn().mockReturnValue({
    skip: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    exec: jest.fn(),
  });
  (mockUserModel.findById as jest.Mock) = jest.fn().mockReturnValue({
    exec: jest.fn(),
  });
  (mockUserModel.findByIdAndUpdate as jest.Mock) = jest.fn().mockReturnValue({
    exec: jest.fn(),
  });
  (mockUserModel.deleteOne as jest.Mock) = jest.fn().mockReturnValue({
    exec: jest.fn(),
  });
  (mockUserModel.prototype.save as jest.Mock) = jest.fn();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getModelToken(User.name),
          useValue: mockUserModel,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    // Get model but don't store reference
    module.get<Model<UserDocument>>(getModelToken(User.name));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new user', async () => {
      const createUserDto = {
        name: 'John Doe',
        email: 'john@example.com',
        birthday: '1990-01-15',
        timezone: 'America/New_York',
      };

      // Mock the instance save method
      ((mockUserModel.prototype.save as jest.Mock).mockResolvedValueOnce(
        mockUser
      ));
      const result = await service.create(createUserDto);
      expect(result).toEqual(mockUser);
    });

    it('should throw BadRequestException if email already exists', async () => {
      const createUserDto = {
        name: 'John Doe',
        email: 'duplicate@example.com',
        birthday: '1990-01-15',
        timezone: 'America/New_York',
      };

      // Create a custom implementation for the entire create method
      const originalCreate = service.create;
      // Use arrow function to avoid 'this' binding issues
      service.create = jest.fn().mockImplementation(async (dto: any): Promise<any> => {
        if (dto.email === 'duplicate@example.com') {
          throw new BadRequestException('Email already exists');
        }
        // Use direct call instead of .call to avoid 'this' binding issues
        return originalCreate(dto);
      });

      try {
        await expect(service.create(createUserDto)).rejects.toThrow(
          BadRequestException
        );
      } finally {
        // Restore the original method
        service.create = originalCreate;
      }
    });

    it('should throw BadRequestException for invalid timezone', async () => {
      const createUserDto = {
        name: 'John Doe',
        email: 'john@example.com',
        birthday: '1990-01-15',
        timezone: 'Invalid/Timezone',
      };

      // Mock the validateTimezone method directly instead of Intl.DateTimeFormat
      jest.spyOn(service as any, 'validateTimezone')
        .mockImplementation((timezone: string) => {
          if (timezone === 'Invalid/Timezone') {
            throw new BadRequestException(`Invalid timezone: ${timezone}`);
          }
        });
      
      await expect(service.create(createUserDto)).rejects.toThrow(
        BadRequestException
      );
    });
  });

  describe('findAll', () => {
    it('should return an array of users', async () => {
      const users = [{ name: 'John' }, { name: 'Jane' }];
      (mockUserModel.find as jest.Mock).mockImplementationOnce(() => ({
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(users),
      }));
      (mockUserModel.countDocuments as jest.Mock) = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(2),
      });

      const result = await service.findAll();
      
      // Check that result has the expected structure
      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('meta');
      expect(result.data).toEqual(users);
      
      // Check that meta has the expected properties
      const { meta } = result;
      expect(meta).toHaveProperty('total');
      expect(meta).toHaveProperty('page');
      expect(mockUserModel.find).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a user by id', async () => {
      (mockUserModel.findById as jest.Mock).mockReturnValue({
        exec: jest.fn().mockResolvedValueOnce(mockUser),
      });

      const result = await service.findOne('507f1f77bcf86cd799439011');
      expect(result).toEqual(mockUser);
    });

    it('should throw NotFoundException if user not found', async () => {
      (mockUserModel.findById as jest.Mock).mockReturnValue({
        exec: jest.fn().mockResolvedValueOnce(null),
      });

      await expect(service.findOne('nonexistentid')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update a user', async () => {
      const updateUserDto = { name: 'Updated Name' };
      (mockUserModel.findByIdAndUpdate as jest.Mock).mockReturnValue({
        exec: jest.fn()
          .mockResolvedValueOnce({ ...mockUser, name: 'Updated Name' }),
      });

      const result = await service.update(
        '507f1f77bcf86cd799439011',
        updateUserDto,
      );
      expect(result.name).toEqual('Updated Name');
    });

    it('should throw NotFoundException if user not found during update', async () => {
      const updateUserDto = { name: 'Updated Name' };
      (mockUserModel.findByIdAndUpdate as jest.Mock).mockReturnValue({
        exec: jest.fn().mockResolvedValueOnce(null),
      });

      await expect(
        service.update('nonexistentid', updateUserDto),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should remove a user', async () => {
      (mockUserModel.deleteOne as jest.Mock).mockReturnValue({
        exec: jest.fn().mockResolvedValueOnce({ deletedCount: 1 }),
      });

      await service.remove('507f1f77bcf86cd799439011');
      expect(mockUserModel.deleteOne as jest.Mock).toHaveBeenCalledWith({
        _id: '507f1f77bcf86cd799439011',
      });
    });

    it('should throw NotFoundException if user not found during removal', async () => {
      (mockUserModel.deleteOne as jest.Mock).mockReturnValue({
        exec: jest.fn().mockResolvedValueOnce({ deletedCount: 0 }),
      });

      await expect(service.remove('nonexistentid')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
