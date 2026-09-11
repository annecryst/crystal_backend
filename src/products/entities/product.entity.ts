import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

export enum ProductCategory {
  DESSERTS = 'Desserts',
  RICE_MEALS = 'Rice Meals',
  SNACKS_FASTFOODS = 'Snacks & Fastfoods',
  DRINKS = 'Drinks',
  PASTA = 'Pasta',
}

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: string;

  @Column({ name: 'product_name', type: 'varchar', length: 255 })
  productName: string;

  @Column({ name: 'available_quantity', type: 'integer', default: 0 })
  availableQuantity: number;

  @Column({ type: 'numeric', precision: 10, scale: 2 })
  price: number;

  @Column({
    type: 'enum',
    enum: ProductCategory,
  })
  category: ProductCategory;

  @Column({ name: 'image_url', type: 'text', nullable: true })
  imageUrl: string;
}
