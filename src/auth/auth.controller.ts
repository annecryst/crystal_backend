import { Controller, Post, Body, HttpStatus, HttpException } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() body: { email: string; password: string }) {
    return this.authService.registerAdmin(body.email, body.password);
  }

  @Post('login')
  async login(@Body() body: { email: string; password: string }) {
    return this.authService.loginAdmin(body.email, body.password);
  }

  @Post('check-admin-exists')
  async checkAdminExists() {
    const exists = await this.authService.checkAdminExists();
    return { exists };
  }

  @Post('check-email')
  async checkEmail(@Body('email') email: string) {
    const exists = await this.authService.checkEmailExists(email);
    return { exists };
  }

  @Post('forgot-password')
  async forgotPassword(@Body('email') email: string) {
    const success = await this.authService.generateAndSendPasscode(email);
    if (!success) throw new HttpException('Failed to send passcode', HttpStatus.INTERNAL_SERVER_ERROR);
    return { message: 'Passcode sent successfully' };
  }

  @Post('verify-passcode')
  async verifyPasscode(@Body() body: { email: string; passcode: string }) {
    const valid = await this.authService.verifyPasscode(body.email, body.passcode);
    return { valid };
  }

  @Post('reset-password')
  async resetPassword(@Body() body: { email: string; newPassword: string }) {
    const success = await this.authService.resetPassword(body.email, body.newPassword);
    if (!success) throw new HttpException('Failed to reset password', HttpStatus.INTERNAL_SERVER_ERROR);
    return { message: 'Password reset successfully' };
  }
}

