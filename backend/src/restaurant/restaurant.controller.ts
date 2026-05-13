import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
} from '@nestjs/common';
import {
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
import { RestaurantService } from './restaurant.service';

@Controller()
export class RestaurantController {
  constructor(private readonly restaurantService: RestaurantService) {}

  @Get('health')
  health() {
    return { ok: true };
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
  ) {
    return this.restaurantService.updateShop(id, dto);
  }

  @Delete('shops/:id')
  deleteShop(@Param('id', ParseIntPipe) id: number) {
    return this.restaurantService.deleteShop(id);
  }

  @Post('keeps')
  createKeep(@Body() dto: CreateKeepDto) {
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
  ) {
    return this.restaurantService.deleteKeep(userId, shopId);
  }

  @Post('reviews')
  createReview(@Body() dto: CreateReviewDto) {
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
  ) {
    return this.restaurantService.updateReview(id, dto);
  }

  @Delete('reviews/:id')
  deleteReview(@Param('id', ParseIntPipe) id: number) {
    return this.restaurantService.deleteReview(id);
  }

  @Post('comments')
  createComment(@Body() dto: CreateCommentDto) {
    return this.restaurantService.createComment(dto);
  }

  @Post('visits')
  createVisit(@Body() dto: CreateVisitDto) {
    return this.restaurantService.createVisit(dto);
  }

  @Get('users/:id/visits')
  findVisits(@Param('id', ParseIntPipe) id: number) {
    return this.restaurantService.findVisitsByUser(id);
  }
}
