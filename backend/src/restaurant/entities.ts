import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 80 })
  name: string;

  @Column({ length: 160, unique: true })
  email: string;

  @OneToMany(() => Keep, (keep) => keep.user)
  keeps: Keep[];

  @OneToMany(() => Review, (review) => review.user)
  reviews: Review[];

  @OneToMany(() => Visit, (visit) => visit.user)
  visits: Visit[];

  @CreateDateColumn()
  createdAt: Date;
}

@Entity('shop_owners')
export class ShopOwner {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 80 })
  name: string;

  @Column({ length: 160, unique: true })
  email: string;

  @OneToMany(() => Shop, (shop) => shop.owner)
  shops: Shop[];

  @CreateDateColumn()
  createdAt: Date;
}

@Entity('shops')
export class Shop {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 120 })
  name: string;

  @Column({ length: 120 })
  category: string;

  @Column({ length: 255 })
  address: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @ManyToOne(() => ShopOwner, (owner) => owner.shops, {
    eager: true,
    onDelete: 'CASCADE',
  })
  owner: ShopOwner;

  @OneToMany(() => Keep, (keep) => keep.shop)
  keeps: Keep[];

  @OneToMany(() => Review, (review) => review.shop)
  reviews: Review[];

  @OneToMany(() => Visit, (visit) => visit.shop)
  visits: Visit[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('keeps')
@Unique(['user', 'shop'])
export class Keep {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, (user) => user.keeps, {
    eager: true,
    onDelete: 'CASCADE',
  })
  user: User;

  @ManyToOne(() => Shop, (shop) => shop.keeps, {
    eager: true,
    onDelete: 'CASCADE',
  })
  shop: Shop;

  @CreateDateColumn()
  createdAt: Date;
}

@Entity('reviews')
@Unique(['user', 'shop'])
export class Review {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'tinyint' })
  rating: number;

  @Column({ type: 'text' })
  content: string;

  @ManyToOne(() => User, (user) => user.reviews, {
    eager: true,
    onDelete: 'CASCADE',
  })
  user: User;

  @ManyToOne(() => Shop, (shop) => shop.reviews, { onDelete: 'CASCADE' })
  shop: Shop;

  @OneToMany(() => Comment, (comment) => comment.review)
  comments: Comment[];

  @CreateDateColumn()
  createdAt: Date;
}

export enum CommentAuthorType {
  User = 'USER',
  ShopOwner = 'SHOP_OWNER',
}

@Entity('comments')
export class Comment {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'enum', enum: CommentAuthorType })
  authorType: CommentAuthorType;

  @Column()
  authorId: number;

  @Column({ type: 'text' })
  content: string;

  @ManyToOne(() => Review, (review) => review.comments, { onDelete: 'CASCADE' })
  review: Review;

  @CreateDateColumn()
  createdAt: Date;
}

@Entity('visits')
export class Visit {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, (user) => user.visits, {
    eager: true,
    onDelete: 'CASCADE',
  })
  user: User;

  @ManyToOne(() => Shop, (shop) => shop.visits, { onDelete: 'CASCADE' })
  shop: Shop;

  @Column({ type: 'date' })
  visitedAt: string;

  @Column({ type: 'text', nullable: true })
  memo: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
