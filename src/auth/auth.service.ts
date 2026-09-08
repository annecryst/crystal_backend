import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { PasswordReset } from './entities/password-reset.entity';
import * as nodemailer from 'nodemailer';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  private transporter: nodemailer.Transporter;

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(PasswordReset)
    private readonly resetRepository: Repository<PasswordReset>,
    private readonly configService: ConfigService,
  ) {
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: this.configService.get<string>('GMAIL_EMAIL'),
        pass: this.configService.get<string>('GMAIL_APP_PASSWORD'),
      },
    });
  }

  async checkEmailExists(email: string): Promise<boolean> {
    const user = await this.userRepository.findOne({ where: { email } });
    return !!user;
  }

  async generateAndSendPasscode(email: string): Promise<boolean> {
    try {
      const passcode = Math.floor(100000 + Math.random() * 900000).toString();
      const expirationTime = new Date(Date.now() + 10 * 60000); // 10 mins

      const reset = this.resetRepository.create({
        email,
        passcode,
        expirationTime,
      });
      await this.resetRepository.save(reset);

      await this.transporter.sendMail({
        from: `Crystalicious Admin <${this.configService.get<string>('GMAIL_EMAIL')}>`,
        to: email,
        subject: 'Your Password Reset Passcode',
        text: `Your password reset passcode is: ${passcode}. It will expire in 10 minutes.`,
      });
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  }

  async verifyPasscode(email: string, passcode: string): Promise<boolean> {
    const reset = await this.resetRepository.findOne({
      where: { 
        email, 
        passcode,
        expirationTime: MoreThanOrEqual(new Date())
      },
      order: { timestamp: 'DESC' }
    });
    return !!reset;
  }

  async resetPassword(email: string, newPassword: string): Promise<boolean> {
    try {
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await this.userRepository.update({ email }, { password: hashedPassword });
      await this.resetRepository.delete({ email });
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  }
}
