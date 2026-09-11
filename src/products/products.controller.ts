import { Controller, Get, Post, Put, Delete, Param, Query, Body, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { ProductsService } from './products.service';
import { Product } from './entities/product.entity';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  async findAll(@Query('category') category?: string) {
    if (category) {
      return this.productsService.findByCategory(category);
    }
    return this.productsService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.productsService.findOne(id);
  }

  @Post()
  async create(@Body() productData: Partial<Product>) {
    return this.productsService.create(productData);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() productData: Partial<Product>) {
    return this.productsService.update(id, productData);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    await this.productsService.delete(id);
    return { success: true, message: 'Product deleted successfully' };
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadImage(
    @UploadedFile() file: Express.Multer.File,
    @Body('productName') productName?: string,
  ) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }
    const url = await this.productsService.uploadImage(file, productName);
    return { url };
  }
}
