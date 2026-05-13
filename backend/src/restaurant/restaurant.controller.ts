import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import {
  AdminLoginDto,
  CreateCommentDto,
  CreateKeepDto,
  CreateReviewDto,
  CreateShopDto,
  CreateShopOwnerDto,
  CreateUserDto,
  CreateVisitDto,
  UpdateReviewDto,
  UpdateShopDto,
} from './dto';
import { AuthService } from './auth.service';
import { CommentAuthorType } from './entities';
import { RestaurantService } from './restaurant.service';

@Controller()
export class RestaurantController {
  constructor(
    private readonly restaurantService: RestaurantService,
    private readonly authService: AuthService,
  ) {}

  @Get('health')
  health() {
    return { ok: true };
  }

  @Post('auth/admin/login')
  adminLogin(@Body() dto: AdminLoginDto) {
    return this.authService.adminLogin(dto.email, dto.password);
  }

  @Get('admin/summary')
  adminSummary(@Req() request: Request) {
    this.authService.assertAdmin(this.authService.getRequestUser(request));
    return this.restaurantService.adminSummary();
  }

  @Post('users')
  createUser(@Body() dto: CreateUserDto) {
    return this.restaurantService.createUser(dto);
  }

  @Get('users')
  findUsers() {
    return this.restaurantService.findUsers();
  }

  @Post('shop-owners')
  createOwner(@Body() dto: CreateShopOwnerDto) {
    return this.restaurantService.createOwner(dto);
  }

  @Get('shop-owners')
  findOwners() {
    return this.restaurantService.findOwners();
  }

  @Post('shops')
  createShop(@Body() dto: CreateShopDto) {
    return this.restaurantService.createShop(dto);
  }

  @Get('shops')
  findShops() {
    return this.restaurantService.findShops();
  }

  @Get('shops/:id')
  findShop(@Param('id', ParseIntPipe) id: number) {
    return this.restaurantService.findShop(id);
  }

  @Put('shops/:id')
  updateShop(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateShopDto,
    @Req() request: Request,
  ) {
    this.authService.assertAdmin(this.authService.getRequestUser(request));
    return this.restaurantService.updateShop(id, dto);
  }

  @Delete('shops/:id')
  deleteShop(@Param('id', ParseIntPipe) id: number, @Req() request: Request) {
    this.authService.assertAdmin(this.authService.getRequestUser(request));
    return this.restaurantService.deleteShop(id);
  }

  @Post('keeps')
  createKeep(@Body() dto: CreateKeepDto, @Req() request: Request) {
    this.authService.assertAdminOrSelf(
      this.authService.getRequestUser(request),
      dto.userId,
    );
    return this.restaurantService.createKeep(dto);
  }

  @Get('users/:id/keeps')
  findKeeps(@Param('id', ParseIntPipe) id: number) {
    return this.restaurantService.findKeepsByUser(id);
  }

  @Delete('users/:userId/keeps/:shopId')
  deleteKeep(
    @Param('userId', ParseIntPipe) userId: number,
    @Param('shopId', ParseIntPipe) shopId: number,
    @Req() request: Request,
  ) {
    this.authService.assertAdminOrSelf(
      this.authService.getRequestUser(request),
      userId,
    );
    return this.restaurantService.deleteKeep(userId, shopId);
  }

  @Post('reviews')
  createReview(@Body() dto: CreateReviewDto, @Req() request: Request) {
    this.authService.assertAdminOrSelf(
      this.authService.getRequestUser(request),
      dto.userId,
    );
    return this.restaurantService.createReview(dto);
  }

  @Get('shops/:id/reviews')
  findReviews(@Param('id', ParseIntPipe) id: number) {
    return this.restaurantService.findReviewsByShop(id);
  }

  @Put('reviews/:id')
  updateReview(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateReviewDto,
    @Req() request: Request,
  ) {
    return this.restaurantService.findReviewOwnerId(id).then((ownerId) => {
      this.authService.assertAdminOrSelf(
        this.authService.getRequestUser(request),
        ownerId,
      );
      return this.restaurantService.updateReview(id, dto);
    });
  }

  @Delete('reviews/:id')
  deleteReview(@Param('id', ParseIntPipe) id: number, @Req() request: Request) {
    return this.restaurantService.findReviewOwnerId(id).then((ownerId) => {
      this.authService.assertAdminOrSelf(
        this.authService.getRequestUser(request),
        ownerId,
      );
      return this.restaurantService.deleteReview(id);
    });
  }

  @Post('comments')
  createComment(@Body() dto: CreateCommentDto, @Req() request: Request) {
    if (dto.authorType === CommentAuthorType.User) {
      this.authService.assertAdminOrSelf(
        this.authService.getRequestUser(request),
        dto.authorId,
      );
    }
    return this.restaurantService.createComment(dto);
  }

  @Post('visits')
  createVisit(@Body() dto: CreateVisitDto, @Req() request: Request) {
    this.authService.assertAdminOrSelf(
      this.authService.getRequestUser(request),
      dto.userId,
    );
    return this.restaurantService.createVisit(dto);
  }

  @Get('users/:id/visits')
  findVisits(@Param('id', ParseIntPipe) id: number) {
    return this.restaurantService.findVisitsByUser(id);
  }
}
