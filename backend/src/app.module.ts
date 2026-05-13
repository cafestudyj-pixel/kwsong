import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RestaurantModule } from './restaurant/restaurant.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: process.env.DB_HOST ?? process.env.MYSQLHOST ?? 'localhost',
      port: Number(process.env.DB_PORT ?? process.env.MYSQLPORT ?? 3306),
      username: process.env.DB_USER ?? process.env.MYSQLUSER ?? 'root',
      password:
        process.env.DB_PASSWORD ?? process.env.MYSQLPASSWORD ?? '12341234',
      database: process.env.DB_NAME ?? process.env.MYSQLDATABASE ?? 'matzip',
      autoLoadEntities: true,
      synchronize: process.env.DB_SYNC === 'true',
      timezone: 'Z',
    }),
    RestaurantModule,
  ],
})
export class AppModule {}
