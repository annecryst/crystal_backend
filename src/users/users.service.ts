import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserType } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async findAllCustomers(): Promise<Partial<User>[]> {
    const customers = await this.userRepository.find({
      where: { type: UserType.CUSTOMER },
      order: { id: 'DESC' },
    });
    // Return without password
    return customers.map(({ password, ...rest }) => rest);
  }

  async getCustomerCount(): Promise<number> {
    return this.userRepository.count({
      where: { type: UserType.CUSTOMER },
    });
  }

  async findAll(): Promise<Partial<User>[]> {
    const users = await this.userRepository.find({
      order: { id: 'DESC' },
    });
    return users.map(({ password, ...rest }) => rest);
  }
}
