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
  }): Promise<{ success: boolean; message: string; order?: Order }> {
    try {
      const order = this.orderRepository.create({
        userId: orderData.userId,
        userEmail: orderData.userEmail,
        totalAmount: orderData.totalAmount,
        paymentMethod: orderData.paymentMethod as any,
        paymentReference: orderData.paymentReference || undefined,
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
}
