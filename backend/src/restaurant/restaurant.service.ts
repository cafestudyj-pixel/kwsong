import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Comment,
  CommentAuthorType,
  Keep,
  Review,
  Shop,
  ShopOwner,
  User,
  Visit,
} from './entities';
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

@Injectable()
export class RestaurantService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(ShopOwner) private readonly owners: Repository<ShopOwner>,
    @InjectRepository(Shop) private readonly shops: Repository<Shop>,
    @InjectRepository(Keep) private readonly keeps: Repository<Keep>,
    @InjectRepository(Review) private readonly reviews: Repository<Review>,
    @InjectRepository(Comment) private readonly comments: Repository<Comment>,
    @InjectRepository(Visit) private readonly visits: Repository<Visit>,
  ) {}

  createUser(dto: CreateUserDto) {
    return this.users.save(this.users.create(dto));
  }

  findUsers() {
    return this.users.find({ order: { createdAt: 'DESC' } });
  }

  async adminSummary() {
    const [
      userCount,
      shopCount,
      reviewCount,
      visitCount,
      recentShops,
      recentReviews,
    ] = await Promise.all([
      this.users.count(),
      this.shops.count(),
      this.reviews.count(),
      this.visits.count(),
      this.shops.find({ order: { createdAt: 'DESC' }, take: 5 }),
      this.reviews.find({
        relations: { shop: true },
        order: { createdAt: 'DESC' },
        take: 5,
      }),
    ]);

    return {
      counts: {
        users: userCount,
        shops: shopCount,
        reviews: reviewCount,
        visits: visitCount,
      },
      recentShops,
      recentReviews,
    };
  }

  createOwner(dto: CreateShopOwnerDto) {
    return this.owners.save(this.owners.create(dto));
  }

  findOwners() {
    return this.owners.find({ order: { createdAt: 'DESC' } });
  }

  async createShop(dto: CreateShopDto) {
    const owner = await this.findOwnerOrThrow(dto.ownerId);
    return this.shops.save(this.shops.create({ ...dto, owner }));
  }

  async findShops() {
    const shops = await this.shops.find({ order: { createdAt: 'DESC' } });
    return Promise.all(shops.map((shop) => this.withShopStats(shop)));
  }

  async findShop(id: number) {
    const shop = await this.findShopOrThrow(id);
    return this.withShopStats(shop);
  }

  async updateShop(id: number, dto: UpdateShopDto) {
    const shop = await this.findShopOrThrow(id);
    if (dto.ownerId !== undefined) {
      shop.owner = await this.findOwnerOrThrow(dto.ownerId);
    }
    if (dto.name !== undefined) shop.name = dto.name;
    if (dto.category !== undefined) shop.category = dto.category;
    if (dto.address !== undefined) shop.address = dto.address;
    if (dto.description !== undefined) shop.description = dto.description;
    const updated = await this.shops.save(shop);
    return this.withShopStats(updated);
  }

  async deleteShop(id: number) {
    const shop = await this.findShopOrThrow(id);
    await this.shops.remove(shop);
    return { deleted: true, id };
  }

  async createKeep(dto: CreateKeepDto) {
    const [user, shop] = await Promise.all([
      this.findUserOrThrow(dto.userId),
      this.findShopOrThrow(dto.shopId),
    ]);
    const exists = await this.keeps.findOne({
      where: { user: { id: user.id }, shop: { id: shop.id } },
    });
    if (exists) {
      return exists;
    }
    return this.keeps.save(this.keeps.create({ user, shop }));
  }

  async findKeepsByUser(userId: number) {
    await this.findUserOrThrow(userId);
    return this.keeps.find({
      where: { user: { id: userId } },
      relations: { shop: true },
      order: { createdAt: 'DESC' },
    });
  }

  async deleteKeep(userId: number, shopId: number) {
    await Promise.all([
      this.findUserOrThrow(userId),
      this.findShopOrThrow(shopId),
    ]);
    const keep = await this.keeps.findOne({
      where: { user: { id: userId }, shop: { id: shopId } },
    });
    if (!keep) {
      throw new NotFoundException(
        `Keep for user ${userId} and shop ${shopId} not found`,
      );
    }
    await this.keeps.remove(keep);
    return { deleted: true, userId, shopId };
  }

  async createReview(dto: CreateReviewDto) {
    const [user, shop] = await Promise.all([
      this.findUserOrThrow(dto.userId),
      this.findShopOrThrow(dto.shopId),
    ]);
    const exists = await this.reviews.findOne({
      where: { user: { id: user.id }, shop: { id: shop.id } },
    });
    if (exists) {
      throw new ConflictException('A user can leave one review per shop.');
    }
    return this.reviews.save(this.reviews.create({ ...dto, user, shop }));
  }

  findReviewsByShop(shopId: number) {
    return this.reviews.find({
      where: { shop: { id: shopId } },
      relations: { comments: true },
      order: { createdAt: 'DESC' },
    });
  }

  async updateReview(id: number, dto: UpdateReviewDto) {
    const review = await this.findReviewOrThrow(id);
    if (dto.rating !== undefined) review.rating = dto.rating;
    if (dto.content !== undefined) review.content = dto.content;
    return this.reviews.save(review);
  }

  async findReviewOwnerId(id: number) {
    const review = await this.findReviewOrThrow(id);
    return review.user.id;
  }

  async deleteReview(id: number) {
    const review = await this.findReviewOrThrow(id);
    await this.reviews.remove(review);
    return { deleted: true, id };
  }

  async createComment(dto: CreateCommentDto) {
    const review = await this.findReviewOrThrow(dto.reviewId);
    await this.assertAuthorExists(dto.authorType, dto.authorId);
    return this.comments.save(this.comments.create({ ...dto, review }));
  }

  async createVisit(dto: CreateVisitDto) {
    const [user, shop] = await Promise.all([
      this.findUserOrThrow(dto.userId),
      this.findShopOrThrow(dto.shopId),
    ]);
    return this.visits.save(
      this.visits.create({ ...dto, user, shop, memo: dto.memo ?? null }),
    );
  }

  findVisitsByUser(userId: number) {
    return this.visits.find({
      where: { user: { id: userId } },
      relations: { shop: true },
      order: { visitedAt: 'DESC' },
    });
  }

  private async withShopStats(shop: Shop) {
    const [keepCount, visitCount, reviews] = await Promise.all([
      this.keeps.count({ where: { shop: { id: shop.id } } }),
      this.visits.count({ where: { shop: { id: shop.id } } }),
      this.findReviewsByShop(shop.id),
    ]);
    const averageRating =
      reviews.length === 0
        ? 0
        : reviews.reduce((sum, review) => sum + review.rating, 0) /
          reviews.length;
    return {
      ...shop,
      keepCount,
      visitCount,
      reviewCount: reviews.length,
      averageRating,
      reviews,
    };
  }

  private async findUserOrThrow(id: number) {
    const user = await this.users.findOneBy({ id });
    if (!user) throw new NotFoundException(`User ${id} not found`);
    return user;
  }

  private async findOwnerOrThrow(id: number) {
    const owner = await this.owners.findOneBy({ id });
    if (!owner) throw new NotFoundException(`ShopOwner ${id} not found`);
    return owner;
  }

  private async findShopOrThrow(id: number) {
    const shop = await this.shops.findOneBy({ id });
    if (!shop) throw new NotFoundException(`Shop ${id} not found`);
    return shop;
  }

  private async findReviewOrThrow(id: number) {
    const review = await this.reviews.findOneBy({ id });
    if (!review) throw new NotFoundException(`Review ${id} not found`);
    return review;
  }

  private async assertAuthorExists(
    authorType: CommentAuthorType,
    authorId: number,
  ) {
    if (authorType === CommentAuthorType.User) {
      await this.findUserOrThrow(authorId);
      return;
    }
    await this.findOwnerOrThrow(authorId);
  }
}
