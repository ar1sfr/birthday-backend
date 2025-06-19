# Birthday Notification System

A NestJS application that manages user data and sends birthday notifications to users at 9 AM in their local timezone. The system features pagination support for user listings and robust timezone validation.

## Features

- **User Management**:
  - Complete CRUD operations
  - Pagination support for listing users
  - Filtering capabilities

- **Birthday Processing**:
  - Automatic birthday messages
  - Timezone-aware scheduling
  - Sends messages at 9 AM in each user's local timezone

- **Data Validation**:
  - Email format validation
  - Timezone validation using IANA timezone database
  - Birthday date format validation
  - Duplicate email prevention

- **Robust Architecture**:
  - MongoDB integration with Mongoose ODM
  - Modular NestJS structure
  - Comprehensive error handling
  - Docker containerization

## Tech Stack

- **Backend Framework**:
  - NestJS v11.0.1
  - Node.js v20
  - TypeScript v5.3.3

- **Database**:
  - MongoDB v7.0
  - Mongoose ODM v8.1.1

- **Validation & Processing**:
  - class-validator v0.14.1
  - class-transformer v0.5.1
  - Custom timezone validators

- **Testing**:
  - Jest v29.7.0
  - Supertest for API testing

- **Containerization**:
  - Docker
  - Docker Compose

## Prerequisites

- Node.js (v16 or later)
- npm or yarn
- Docker and Docker Compose (for containerized deployment)
- MongoDB (if running locally without Docker)

## Installation

### Local Development

1. Clone the repository

```bash
git clone <repository-url>
cd <repository-directory>
```

2. Install dependencies:

```bash
npm install --legacy-peer-deps
```

> **Note**: The `--legacy-peer-deps` flag is required due to a dependency conflict between @nestjs/common v11 and @nestjs/config v3.3.0.

3. Create a `.env` file with the following variables:

```
PORT=3000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/birthday-app
```

4. Start the application:

```bash
npm run start:dev
```

### Docker Deployment

1. Clone the repository

```bash
git clone <repository-url>
cd <repository-directory>
```

2. Run with Docker Compose:

```bash
docker-compose up -d --build
```

> **Note**: The `--build` flag ensures that the Docker image is rebuilt with the latest code changes. The Dockerfile includes the `--legacy-peer-deps` flag to resolve dependency conflicts.

3. Access the application:

The application will be available at http://localhost:3000

4. Monitor logs (optional):

```bash
docker-compose logs -f app
```

## API Endpoints

### Users

- **POST /users** - Create a new user
  - Request body: `{ "name": "John Doe", "email": "john@example.com", "birthday": "1990-01-15", "timezone": "America/New_York" }`

- **GET /users** - Get all users with pagination
  - Query parameters: 
    - `page`: Page number (default: 1)
    - `limit`: Number of items per page (default: 10)
  - Response includes pagination metadata (total, page, limit, totalPages, etc.)

- **GET /users/:id** - Get a user by ID

- **PUT /users/:id** - Update a user
  - Request body: `{ "name": "Updated Name" }` (all fields are optional)

- **DELETE /users/:id** - Delete a user

## Testing

The project includes comprehensive test coverage for all components, including unit tests for services, controllers, and the birthday worker.

Run the tests with:

```bash
npm test
```

For test coverage:

```bash
npm run test:cov
```

### Test Implementation Notes

- **Mock Implementation**: The tests use Jest mocks to simulate MongoDB operations
- **Mongoose Query Chain**: Special attention is given to properly mocking Mongoose query chains (find, skip, limit, exec)
- **Timezone Testing**: Includes tests for timezone validation and birthday calculations
- **Pagination Testing**: Tests for the pagination feature in the users service

## Architecture

### Core Components

- **Users Module**: 
  - Handles user CRUD operations with pagination support
  - Implements timezone validation
  - Provides methods to find users with birthdays on the current day

- **Birthday Worker Module**: 
  - Manages the scheduling of birthday checks using cron jobs
  - Processes and sends birthday messages at 9 AM in each user's local timezone
  - Integrates with the Users service to find users with birthdays

### Data Layer

- **MongoDB Integration**: 
  - Uses Mongoose ODM for data modeling and validation
  - Implements efficient querying with pagination
  - Stores user data persistently

### Cross-Cutting Concerns

- **Validation**: 
  - Uses class-validator for DTO validation
  - Implements custom timezone validation
  - Handles duplicate email detection

- **Error Handling**:
  - Comprehensive exception handling for all operations
  - Custom exceptions for specific error scenarios

## Error Handling

The application implements a robust error handling strategy:

### Validation Errors
- **Input Validation**: Automatic validation of DTOs using class-validator
- **Custom Validators**: Special validation for timezone strings
- **Meaningful Error Messages**: Clear error messages for validation failures

### Business Logic Errors
- **Duplicate Detection**: Prevents duplicate email addresses
- **Not Found Handling**: Proper 404 responses when resources don't exist
- **Timezone Processing**: Graceful handling of timezone calculation edge cases

### System Errors
- **Database Errors**: Proper handling of MongoDB connection and query errors
- **Scheduled Task Errors**: Error handling in the birthday worker cron job
- **Dependency Issues**: Documentation of dependency conflicts and resolutions

## Known Issues and Troubleshooting

### Dependency Conflicts

- **NestJS Version Compatibility**: This project uses NestJS v11, but some packages like @nestjs/config haven't been updated to support v11 yet. The Dockerfile uses `--legacy-peer-deps` to resolve this.

- **Alternative Solutions**:
  - Downgrade @nestjs/common and related packages to v10
  - Wait for @nestjs/config to release a version compatible with NestJS v11

### Common Issues

- **MongoDB Connection**: If you encounter MongoDB connection issues, ensure the MongoDB service is running and the connection string is correct.

- **Timezone Validation**: If timezone validation fails, ensure you're using valid IANA timezone strings (e.g., 'America/New_York', 'Europe/London').

- **Test Failures**: If tests fail with Mongoose-related errors, check that the mock implementations properly chain methods like find(), skip(), limit(), and exec().

## License

This project is licensed under the MIT License - see the LICENSE file for details.
