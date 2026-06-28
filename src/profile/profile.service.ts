import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class ProfileService {
  constructor(private prisma: PrismaService) {}

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, firstName: true, lastName: true, phone: true, avatarUrl: true, role: true },
    });
    if (!user) throw new NotFoundException('Profile not found');
    return user;
  }

  async updateProfile(userId: string, dto: any) {
    return this.prisma.user.update({ where: { id: userId }, data: dto, select: { id: true, email: true, firstName: true, lastName: true, phone: true, avatarUrl: true, role: true } });
  }

  async updateAvatar(userId: string, url: string) {
    return this.prisma.user.update({ where: { id: userId }, data: { avatarUrl: url }, select: { avatarUrl: true } });
  }
}
