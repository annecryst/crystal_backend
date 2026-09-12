import { Controller, Post, Get, Patch, Body, Param, Query, Res } from '@nestjs/common';
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

  @Get('paymongo/total-received')
  async getPaymongoTotalReceived() {
    return this.ordersService.getPaymongoTotalReceived();
  }

  @Post('paymongo-checkout')
  async createPaymongoCheckout(
    @Body()
    body: {
      userId: string;
      userEmail: string;
      totalAmount: number;
      paymentMethod: string;
      items: Array<{
        productId: string;
        productName: string;
        quantity: number;
        price: number;
        subtotal: number;
      }>;
    },
  ) {
    // Create the order as Pending
    const orderResult = await this.ordersService.createOrder({
      ...body,
      paymentMethod: body.paymentMethod,
    });

    if (orderResult.success && orderResult.order) {
      // Create PayMongo Checkout Session
      const checkoutUrl = await this.ordersService.createPaymongoCheckout(
        orderResult.order.id,
        body.totalAmount,
        `Crystalicious Order #${orderResult.order.id}`,
        body.items,
      );
      
      if (checkoutUrl) {
        return { success: true, checkoutUrl, orderId: orderResult.order.id };
      }
    }
    
    return { success: false, message: 'Failed to create checkout session' };
  }

  @Post('paymongo-webhook')
  async handlePaymongoWebhook(@Body() payload: any) {
    const success = await this.ordersService.handlePaymongoWebhook(payload);
    return { success };
  @Get('payment-success')
  async paymentSuccess(@Query('order_id') orderId: string, @Res() res: any) {
    if (orderId) {
      await this.ordersService.updateStatus(orderId, 'Paid');
    }
    // Redirect to a simple success page or back to the app using a deep link if configured
    return res.send('<html><body><h2>Payment Successful!</h2><p>You can close this window and return to the Crystalicious app.</p></body></html>');
  }

  @Get('payment-cancelled')
  async paymentCancelled(@Query('order_id') orderId: string, @Res() res: any) {
    // You might want to update status to Cancelled or just leave it Pending
    return res.send('<html><body><h2>Payment Cancelled</h2><p>You can close this window and return to the Crystalicious app.</p></body></html>');
  }
}
