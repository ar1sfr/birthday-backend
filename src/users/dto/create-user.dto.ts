import { IsEmail, IsISO8601, IsNotEmpty, IsString } from 'class-validator';

export class CreateUserDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @IsISO8601()
  birthday: string;

  @IsNotEmpty()
  @IsString()
  timezone: string;
}
