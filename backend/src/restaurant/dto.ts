import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { CommentAuthorType } from './entities';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  name: string;

  @IsEmail()
  @MaxLength(160)
  email: string;
}

export class CreateShopOwnerDto extends CreateUserDto {}

export class CreateShopDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  category: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  address: string;

  @IsOptional()
  @IsString()
  description?: string;

  @Type(() => Number)
  @IsInt()
  ownerId: number;
}

export class UpdateShopDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  category?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  address?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  ownerId?: number;
}

export class CreateKeepDto {
  @Type(() => Number)
  @IsInt()
  userId: number;

  @Type(() => Number)
  @IsInt()
  shopId: number;
}

export class CreateReviewDto extends CreateKeepDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @IsString()
  @IsNotEmpty()
  content: string;
}

export class UpdateReviewDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  rating?: number;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  content?: string;
}

export class CreateCommentDto {
  @Type(() => Number)
  @IsInt()
  reviewId: number;

  @IsEnum(CommentAuthorType)
  authorType: CommentAuthorType;

  @Type(() => Number)
  @IsInt()
  authorId: number;

  @IsString()
  @IsNotEmpty()
  content: string;
}

export class CreateVisitDto extends CreateKeepDto {
  @IsDateString()
  visitedAt: string;

  @IsOptional()
  @IsString()
  memo?: string;
}
