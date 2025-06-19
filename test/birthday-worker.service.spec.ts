import { Test, TestingModule } from '@nestjs/testing';
import { BirthdayWorkerService } from '../src/birthday-worker/birthday-worker.service';
import { UsersService } from '../src/users/users.service';

describe('BirthdayWorkerService', () => {
  let service: BirthdayWorkerService;
  let _usersService: UsersService;

  // Mock user with today's birthday
  const mockBirthdayUser = {
    _id: '507f1f77bcf86cd799439011',
    name: 'John Doe',
    email: 'john@example.com',
    birthday: new Date('1990-01-15'), // This will be replaced in tests
    timezone: 'America/New_York',
  };

  // Mock UsersService
  const mockUsersService = {
    findUsersWithBirthdayToday: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BirthdayWorkerService,
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
      ],
    }).compile();

    service = module.get<BirthdayWorkerService>(BirthdayWorkerService);
    _usersService = module.get<UsersService>(UsersService);

    // Reset mocks
    jest.clearAllMocks();

    // Mock Date to return a fixed date for testing
    const currentDate = new Date(2023, 0, 15, 9, 0, 0); // January 15, 2023, 9:00 AM
    const OriginalDate = global.Date;
    jest.spyOn(global, 'Date').mockImplementation((arg) => {
      return arg ? new OriginalDate(arg) : currentDate;
    });
    // Preserve Date.now functionality
    global.Date.now = () => currentDate.getTime();
    // Restore other Date static methods
    global.Date.parse = OriginalDate.parse;
    global.Date.UTC = OriginalDate.UTC;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('checkBirthdays', () => {
    it('should process users with birthdays today', async () => {
      // Create a spy on the private method
      const processSpy = jest.spyOn(service as any, 'processBirthdayMessage');

      // Mock the findUsersWithBirthdayToday to return users
      mockUsersService.findUsersWithBirthdayToday.mockResolvedValueOnce([
        mockBirthdayUser,
      ]);

      await service.checkBirthdays();

      expect(mockUsersService.findUsersWithBirthdayToday).toHaveBeenCalled();
      expect(processSpy).toHaveBeenCalledWith(mockBirthdayUser);
    });

    it('should handle errors gracefully', async () => {
      // Mock the service to throw an error
      mockUsersService.findUsersWithBirthdayToday.mockRejectedValueOnce(
        new Error('Test error'),
      );

      // Spy on logger.error
      const errorSpy = jest.spyOn(service['logger'], 'error');

      await service.checkBirthdays();

      expect(errorSpy).toHaveBeenCalled();
    });
  });

  // Additional tests for private methods can be added if needed
});
