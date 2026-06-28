import {
  Injectable, NotFoundException, BadRequestException, ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';

export class CreateAppointmentDto {
  salonId: string;
  serviceId: string;
  staffId: string;
  date: string;       // "2025-07-15"
  startTime: string;  // "10:30"
  note?: string;
}

@Injectable()
export class AppointmentsService {
  constructor(private prisma: PrismaService) {}

  // ─── Get available slots ───────────────────────────────────────────────────

  async getAvailableSlots(salonId: string, serviceId: string, staffId: string, date: string) {
    const service = await this.prisma.service.findUnique({ where: { id: serviceId } });
    if (!service) throw new NotFoundException('Service not found');

    const dayDate = new Date(date);
    const dayOfWeek = this.getDayOfWeek(dayDate);

    // Check salon working hours
    const workingHours = await this.prisma.workingHours.findUnique({
      where: { salonId_dayOfWeek: { salonId, dayOfWeek } },
    });

    if (!workingHours || workingHours.isClosed) {
      return { slots: [], message: 'Salon is closed on this day' };
    }

    // Check staff schedule
    const staffSchedule = await this.prisma.staffSchedule.findUnique({
      where: { staffId_dayOfWeek: { staffId, dayOfWeek } },
    });

    const startTime = staffSchedule?.startTime || workingHours.openTime;
    const endTime = staffSchedule?.endTime || workingHours.closeTime;

    if (staffSchedule?.isOff) {
      return { slots: [], message: 'Staff member is not available on this day' };
    }

    // Get existing appointments for this staff on this date
    const existing = await this.prisma.appointment.findMany({
      where: {
        staffId,
        date: dayDate,
        status: { notIn: ['CANCELLED', 'REJECTED'] },
      },
      select: { startTime: true, endTime: true },
    });

    // Generate 30-minute slots within working hours
    const slots = this.generateSlots(
      startTime,
      endTime,
      service.duration,
      existing,
    );

    return { slots, date, serviceId, staffId };
  }

  // ─── Book appointment ──────────────────────────────────────────────────────

  async create(customerId: string, dto: CreateAppointmentDto) {
    const service = await this.prisma.service.findUnique({
      where: { id: dto.serviceId },
    });
    if (!service) throw new NotFoundException('Service not found');

    const endTime = this.addMinutes(dto.startTime, service.duration);
    const appointmentDate = new Date(dto.date);

    // Double-booking check
    const conflict = await this.prisma.appointment.findFirst({
      where: {
        staffId: dto.staffId,
        date: appointmentDate,
        status: { notIn: ['CANCELLED', 'REJECTED'] },
        OR: [
          // New appointment starts during existing one
          { startTime: { lte: dto.startTime }, endTime: { gt: dto.startTime } },
          // New appointment ends during existing one
          { startTime: { lt: endTime }, endTime: { gte: endTime } },
          // New appointment wraps existing one
          { startTime: { gte: dto.startTime }, endTime: { lte: endTime } },
        ],
      },
    });

    if (conflict) {
      throw new ConflictException('This time slot is no longer available');
    }

    return this.prisma.appointment.create({
      data: {
        salonId: dto.salonId,
        customerId,
        staffId: dto.staffId,
        serviceId: dto.serviceId,
        date: appointmentDate,
        startTime: dto.startTime,
        endTime,
        totalPrice: service.price,
        note: dto.note,
        status: 'PENDING',
      },
      include: {
        salon: { select: { name: true, address: true, phone: true } },
        service: { select: { name: true, duration: true, price: true } },
        staff: {
          include: { user: { select: { firstName: true, lastName: true } } },
        },
      },
    });
  }

  // ─── Customer: Get my appointments ────────────────────────────────────────

  async findByCustomer(customerId: string, status?: string) {
    return this.prisma.appointment.findMany({
      where: {
        customerId,
        ...(status && { status: status as any }),
      },
      orderBy: [{ date: 'desc' }, { startTime: 'desc' }],
      include: {
        salon: { select: { name: true, slug: true, logoUrl: true, address: true } },
        service: { select: { name: true, duration: true, price: true } },
        staff: {
          include: { user: { select: { firstName: true, lastName: true, avatarUrl: true } } },
        },
      },
    });
  }

  // ─── Customer: Cancel appointment ─────────────────────────────────────────

  async cancel(appointmentId: string, customerId: string, reason?: string) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
    });

    if (!appointment) throw new NotFoundException('Appointment not found');
    if (appointment.customerId !== customerId) {
      throw new BadRequestException('Not your appointment');
    }
    if (['COMPLETED', 'CANCELLED'].includes(appointment.status)) {
      throw new BadRequestException(`Cannot cancel a ${appointment.status.toLowerCase()} appointment`);
    }

    return this.prisma.appointment.update({
      where: { id: appointmentId },
      data: { status: 'CANCELLED', cancelReason: reason },
    });
  }

  // ─── Salon: Update status ──────────────────────────────────────────────────

  async updateStatus(appointmentId: string, status: string, salonId: string) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
    });

    if (!appointment) throw new NotFoundException('Appointment not found');
    if (appointment.salonId !== salonId) {
      throw new BadRequestException('Access denied');
    }

    return this.prisma.appointment.update({
      where: { id: appointmentId },
      data: { status: status as any },
    });
  }

  // ─── Salon: Get appointments by date range ─────────────────────────────────

  async findBySalon(salonId: string, from?: string, to?: string) {
    const fromDate = from ? new Date(from) : new Date();
    const toDate = to ? new Date(to) : new Date(fromDate.getTime() + 7 * 86400000);

    return this.prisma.appointment.findMany({
      where: {
        salonId,
        date: { gte: fromDate, lte: toDate },
        status: { not: 'CANCELLED' },
      },
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
      include: {
        customer: { select: { firstName: true, lastName: true, phone: true } },
        service: { select: { name: true, duration: true, price: true, color: true } },
        staff: {
          include: { user: { select: { firstName: true, lastName: true } } },
        },
      },
    });
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  private generateSlots(
    openTime: string,
    closeTime: string,
    duration: number,
    booked: { startTime: string; endTime: string }[],
  ): { time: string; available: boolean }[] {
    const slots: { time: string; available: boolean }[] = [];
    let current = this.timeToMinutes(openTime);
    const close = this.timeToMinutes(closeTime);

    while (current + duration <= close) {
      const slotTime = this.minutesToTime(current);
      const slotEnd = this.minutesToTime(current + duration);

      const isBooked = booked.some(b => {
        const bStart = this.timeToMinutes(b.startTime);
        const bEnd = this.timeToMinutes(b.endTime);
        return current < bEnd && current + duration > bStart;
      });

      slots.push({ time: slotTime, available: !isBooked });
      current += 30; // 30-minute intervals
    }

    return slots;
  }

  private timeToMinutes(time: string): number {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  }

  private minutesToTime(minutes: number): string {
    const h = Math.floor(minutes / 60).toString().padStart(2, '0');
    const m = (minutes % 60).toString().padStart(2, '0');
    return `${h}:${m}`;
  }

  private addMinutes(time: string, minutes: number): string {
    return this.minutesToTime(this.timeToMinutes(time) + minutes);
  }

  private getDayOfWeek(date: Date): string {
    const days = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
    return days[date.getDay()];
  }
}
