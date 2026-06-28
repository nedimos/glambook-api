import {
  Injectable, NotFoundException, ForbiddenException, ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateSalonDto, UpdateSalonDto, SalonQueryDto } from './salons.dto';

@Injectable()
export class SalonsService {
  constructor(private prisma: PrismaService) {}

  // ─── Public: Browse salons ─────────────────────────────────────────────────

  async findAll(query: SalonQueryDto) {
    const { search, city, type, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where: any = {
      isActive: true,
      deletedAt: null,
      ...(city && { city: { contains: city, mode: 'insensitive' } }),
      ...(type && { type }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
          { city: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [data, total] = await Promise.all([
      this.prisma.salon.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ isFeatured: 'desc' }, { rating: 'desc' }, { createdAt: 'desc' }],
        select: {
          id: true, name: true, slug: true, type: true,
          description: true, city: true, address: true,
          rating: true, reviewCount: true, isVerified: true,
          isFeatured: true, logoUrl: true, coverUrl: true,
          phone: true, instagram: true,
          _count: { select: { services: true, staff: true } },
        },
      }),
      this.prisma.salon.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  // ─── Public: Get single salon ──────────────────────────────────────────────

  async findOne(slug: string) {
    const salon = await this.prisma.salon.findUnique({
      where: { slug, isActive: true, deletedAt: null },
      include: {
        services: {
          where: { isActive: true },
          orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
          include: { category: true },
        },
        serviceCategories: { orderBy: { sortOrder: 'asc' } },
        staff: {
          where: { isActive: true },
          include: {
            user: {
              select: {
                firstName: true, lastName: true, avatarUrl: true, email: true,
              },
            },
            services: { include: { service: true } },
          },
        },
        workingHours: { orderBy: { dayOfWeek: 'asc' } },
        images: { orderBy: { sortOrder: 'asc' } },
        reviews: {
          where: { isVisible: true },
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            customer: { select: { firstName: true, lastName: true, avatarUrl: true } },
          },
        },
      },
    });

    if (!salon) throw new NotFoundException('Salon not found');
    return salon;
  }

  // ─── Owner: Create salon ───────────────────────────────────────────────────

  async create(ownerId: string, dto: CreateSalonDto) {
    const slug = this.generateSlug(dto.name);

    const existing = await this.prisma.salon.findUnique({ where: { slug } });
    if (existing) throw new ConflictException('Salon name already taken');

    return this.prisma.salon.create({
      data: { ...dto, ownerId, slug },
    });
  }

  // ─── Owner: Update salon ───────────────────────────────────────────────────

  async update(salonId: string, ownerId: string, dto: UpdateSalonDto) {
    const salon = await this.prisma.salon.findUnique({ where: { id: salonId } });
    if (!salon) throw new NotFoundException('Salon not found');
    if (salon.ownerId !== ownerId) throw new ForbiddenException('Access denied');

    return this.prisma.salon.update({ where: { id: salonId }, data: dto });
  }

  // ─── Owner: Get own salons ─────────────────────────────────────────────────

  async findByOwner(ownerId: string) {
    return this.prisma.salon.findMany({
      where: { ownerId, deletedAt: null },
      include: {
        _count: {
          select: { appointments: true, staff: true, services: true },
        },
      },
    });
  }

  // ─── Owner: Dashboard stats ────────────────────────────────────────────────

  async getDashboardStats(salonId: string, ownerId: string) {
    const salon = await this.prisma.salon.findUnique({ where: { id: salonId } });
    if (!salon || salon.ownerId !== ownerId) throw new ForbiddenException('Access denied');

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [
      todayAppointments,
      pendingCount,
      totalRevenue,
      totalCustomers,
    ] = await Promise.all([
      this.prisma.appointment.findMany({
        where: {
          salonId,
          date: { gte: today, lt: tomorrow },
          status: { not: 'CANCELLED' },
        },
        include: {
          customer: { select: { firstName: true, lastName: true, phone: true } },
          service: { select: { name: true, duration: true, price: true } },
          staff: { include: { user: { select: { firstName: true, lastName: true } } } },
        },
        orderBy: { startTime: 'asc' },
      }),
      this.prisma.appointment.count({
        where: { salonId, status: 'PENDING' },
      }),
      this.prisma.appointment.aggregate({
        where: { salonId, status: 'COMPLETED' },
        _sum: { totalPrice: true },
      }),
      this.prisma.appointment.groupBy({
        by: ['customerId'],
        where: { salonId },
      }),
    ]);

    return {
      todayAppointments,
      pendingCount,
      totalRevenue: totalRevenue._sum.totalPrice || 0,
      totalCustomers: totalCustomers.length,
    };
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[čć]/g, 'c')
      .replace(/[šđ]/g, 's')
      .replace(/[ž]/g, 'z')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }
}
