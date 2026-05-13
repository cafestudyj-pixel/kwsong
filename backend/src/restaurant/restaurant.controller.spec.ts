import { Test } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { RestaurantController } from './restaurant.controller';
import { RestaurantService } from './restaurant.service';

describe('RestaurantController', () => {
  let controller: RestaurantController;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [RestaurantController],
      providers: [
        {
          provide: RestaurantService,
          useValue: {},
        },
        {
          provide: AuthService,
          useValue: {},
        },
      ],
    }).compile();

    controller = moduleRef.get(RestaurantController);
  });

  it('reports health', () => {
    expect(controller.health()).toEqual({ ok: true });
  });
});
