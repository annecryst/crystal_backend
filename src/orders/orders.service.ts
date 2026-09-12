import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly orderItemRepository: Repository<OrderItem>,
  ) {}

  async createOrder(orderData: {
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
    location?: string;
  }): Promise<{ success: boolean; message: string; order?: Order }> {
    try {
      const order = this.orderRepository.create({
        userId: orderData.userId,
        userEmail: orderData.userEmail,
        totalAmount: orderData.totalAmount,
        paymentMethod: orderData.paymentMethod as any,
        paymentReference: orderData.paymentReference || undefined,
        location: orderData.location || undefined,
        items: orderData.items.map((item) =>
          this.orderItemRepository.create({
            productId: item.productId,
            productName: item.productName,
            quantity: item.quantity,
            price: item.price,
            subtotal: item.subtotal,
          }),
        ),
      });

      const savedOrder = await this.orderRepository.save(order);
      return { success: true, message: 'Order placed successfully!', order: savedOrder };
    } catch (e) {
      console.error(e);
      return { success: false, message: 'Failed to place order.' };
    }
  }

  async findByUser(userId: string): Promise<Order[]> {
    return this.orderRepository.find({
      where: { userId },
      relations: { items: true },
      order: { createdAt: 'DESC' },
    });
  }

  async findAll(): Promise<Order[]> {
    return this.orderRepository.find({
      relations: { items: true },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Order | null> {
    return this.orderRepository.findOne({ 
      where: { id },
      relations: { items: true },
    });
  }

  async updateStatus(id: string, status: string): Promise<{ success: boolean; message: string }> {
    try {
      const order = await this.orderRepository.findOne({ where: { id } });
      if (!order) return { success: false, message: 'Order not found' };

      order.status = status as any;
      await this.orderRepository.save(order);
      return { success: true, message: 'Order status updated successfully' };
    } catch (e) {
      console.error(e);
      return { success: false, message: 'Failed to update order status' };
    }
  }

  async createPaymongoCheckout(
    orderId: string,
    amount: number,
    description: string,
    items: Array<{ productName: string; quantity: number; price: number; subtotal: number }>,
  ): Promise<string | null> {
    const secretKey = process.env.PAYMONGO_SECRET_KEY;
    if (!secretKey) {
      console.error('PAYMONGO_SECRET_KEY is not set');
      return null;
    }

    const encodedKey = Buffer.from(secretKey + ':').toString('base64');

    // Build line_items from order items
    const line_items = items.map((item) => ({
      currency: 'PHP',
      amount: Math.round(item.price * 100), // amount in centavos
      description: item.productName,
      name: item.productName,
      quantity: item.quantity,
    }));

    // Backend URL for redirects and webhooks
    const backendUrl = process.env.RENDER_EXTERNAL_URL || process.env.BACKEND_URL || 'https://crystal-backend-rrem.onrender.com';

    try {
      const response = await fetch('https://api.paymongo.com/v1/checkout_sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${encodedKey}`,
        },
        body: JSON.stringify({
          data: {
            attributes: {
              send_email_receipt: false,
              show_description: true,
              show_line_items: true,
              description: description,
              line_items: line_items,
              payment_method_types: [
                'gcash',
                'grab_pay',
                'paymaya',
                'card',
                'dob',
                'billease',
                'qrph',
              ],
              success_url: `${backendUrl}/orders/payment-success?order_id=${orderId}`,
              cancel_url: `${backendUrl}/orders/payment-cancelled?order_id=${orderId}`,
              reference_number: orderId,
              metadata: {
                order_id: orderId,
              },
            },
          },
        }),
      });

      const data = (await response.json()) as any;
      if (data?.data?.attributes?.checkout_url) {
        // Store the checkout session ID for later verification
        const checkoutSessionId = data.data.id;
        const order = await this.orderRepository.findOne({ where: { id: orderId } });
        if (order) {
          order.paymentReference = checkoutSessionId;
          await this.orderRepository.save(order);
        }
        return data.data.attributes.checkout_url;
      }
      console.error('PayMongo checkout session error:', JSON.stringify(data));
      return null;
    } catch (e) {
      console.error('Error creating PayMongo checkout session', e);
      return null;
    }
  }

  async handlePaymongoWebhook(payload: any): Promise<boolean> {
    try {
      const eventType = payload?.data?.attributes?.type;
      
      // Support both checkout_session and link payment events
      if (eventType === 'checkout_session.payment.paid' || eventType === 'link.payment.paid') {
        const referenceNumber = payload?.data?.attributes?.data?.attributes?.reference_number;
        if (referenceNumber) {
          const order = await this.orderRepository.findOne({ where: { id: referenceNumber } });
          if (order) {
            order.status = 'Paid' as any;
            await this.orderRepository.save(order);
            return true;
          }
        }
      }
      return false;
    } catch (e) {
      console.error('Error handling webhook', e);
      return false;
    }
  }

  async getPaymongoTotalReceived(): Promise<{ success: boolean; total: number }> {
    try {
      const result = await this.orderRepository.createQueryBuilder('order')
        .select('SUM(order.totalAmount)', 'total')
        .where('order.status = :status', { status: 'Paid' })
        .getRawOne();
        
      return { success: true, total: parseFloat(result?.total || '0') };
    } catch (e) {
      console.error(e);
      return { success: false, total: 0 };
    }
  }
}
