import { IsEmail, IsISO8601, IsOptional, IsString } from 'class-validator';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsISO8601()
  birthday?: string;

  @IsOptional()
  @IsString()
  timezone?: string;
}