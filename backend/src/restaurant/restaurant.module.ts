import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
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
import { AuthService } from './auth.service';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'local-development-secret',
      signOptions: { expiresIn: '12h' },
    }),
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
  providers: [RestaurantService, AuthService],
})
export class RestaurantModule {}
