import { Controller, Post, Get, Patch, Body, Param } from '@nestjs/common';
import { OrdersService } from './orders.service';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  async createOrder(
    @Body()
    body: {
      userId: string;
      userEmail: string;
      totalAmount: number;
      paymentMethod: string;
      paymentReference?: string;
      items: Array<{
        productId: string;
        productName: string;
        quantity: number;
        price: number;
        subtotal: number;
      }>;
    },
  ) {
    return this.ordersService.createOrder(body);
  }

  @Get()
  async findAll() {
    return this.ordersService.findAll();
  }

  @Get('user/:userId')
  async findByUser(@Param('userId') userId: string) {
    return this.ordersService.findByUser(userId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.ordersService.findOne(id);
  }

  @Patch(':id/status')
  async updateStatus(@Param('id') id: string, @Body('status') status: string) {
    return this.ordersService.updateStatus(id, status);
  }
}
