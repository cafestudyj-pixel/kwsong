import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  Comment,
  Keep,
  Review,
  Shop,
  ShopOwner,
  User,
  Visit,
} from './entities';
import { RestaurantController } from './restaurant.controller';
import { RestaurantService } from './restaurant.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      ShopOwner,
      Shop,
      Keep,
      Review,
      Comment,
      Visit,
    ]),
  ],
  controllers: [RestaurantController],
  providers: [RestaurantService],
})
export class RestaurantModule {}
