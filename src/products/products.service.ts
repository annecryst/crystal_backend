import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from './entities/product.entity';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class ProductsService {
  private supabase: SupabaseClient;

  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    private readonly configService: ConfigService,
  ) {
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    const supabaseKey = this.configService.get<string>('SUPABASE_ANON_KEY');

    if (!supabaseUrl || !supabaseKey) {
      throw new Error(
        `Missing Supabase config: SUPABASE_URL=${supabaseUrl ? 'set' : 'MISSING'}, SUPABASE_ANON_KEY=${supabaseKey ? 'set' : 'MISSING'}. ` +
        'Set these as environment variables on your deployment platform (e.g. Render dashboard).',
      );
    }

    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  async findAll(): Promise<Product[]> {
    return this.productRepository.find({ order: { productName: 'ASC' } });
  }

  async findOne(id: string): Promise<Product | null> {
    return this.productRepository.findOne({ where: { id } });
  }

  async findByCategory(category: string): Promise<Product[]> {
    return this.productRepository.find({ 
      where: { category: category as any },
      order: { productName: 'ASC' }
    });
  }

  private normalizeProductData(data: any): Partial<Product> {
    const normalized: any = {};
    if (data.productName !== undefined || data.product_name !== undefined) {
      normalized.productName = data.productName ?? data.product_name;
    }
    if (data.availableQuantity !== undefined || data.available_quantity !== undefined) {
      normalized.availableQuantity = data.availableQuantity ?? data.available_quantity;
    }
    if (data.price !== undefined) {
      normalized.price = data.price;
    }
    if (data.category !== undefined) {
      normalized.category = data.category;
    }
    if (data.imageUrl !== undefined || data.image_url !== undefined) {
      normalized.imageUrl = data.imageUrl ?? data.image_url;
    }
    return normalized;
  }

  async create(productData: Partial<Product>): Promise<Product> {
    const normalized = this.normalizeProductData(productData);
    const product = this.productRepository.create(normalized);
    return this.productRepository.save(product);
  }

  async update(id: string, productData: Partial<Product>): Promise<Product> {
    const normalized = this.normalizeProductData(productData);
    await this.productRepository.update(id, normalized);
    const updated = await this.findOne(id);
    if (!updated) {
      throw new Error('Product not found');
    }
    return updated;
  }

  async delete(id: string): Promise<void> {
    await this.productRepository.delete(id);
  }

  async uploadImage(file: Express.Multer.File, productName?: string): Promise<string> {
    try {
      const fileExt = file.originalname.split('.').pop();
      const prefix = productName ? productName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase() : 'image';
      const fileName = `${prefix}_${Date.now()}_${Math.floor(Math.random() * 10000)}.${fileExt}`;
      
      const { data, error } = await this.supabase.storage
        .from('prod_images')
        .upload(fileName, file.buffer, {
          contentType: file.mimetype,
          upsert: false,
        });

      if (error) {
        throw error;
      }

      const { data: publicUrlData } = this.supabase.storage
        .from('prod_images')
        .getPublicUrl(fileName);

      return publicUrlData.publicUrl;
    } catch (error) {
      throw new InternalServerErrorException(`Failed to upload image: ${error.message}`);
    }
  }
}
