import { Controller, Post, Get, Body, Param } from '@nestjs/common';
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

  @Get('user/:userId')
  async findByUser(@Param('userId') userId: string) {
    return this.ordersService.findByUser(userId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.ordersService.findOne(id);
  }
}
