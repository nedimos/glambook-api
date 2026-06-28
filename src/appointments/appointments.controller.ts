import {
  Controller, Get, Post, Put, Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AppointmentsService, CreateAppointmentDto } from './appointments.service';
import { JwtAuthGuard, RolesGuard, Roles } from '../common/guards/auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '@prisma/client';

@ApiTags('Appointments')
@Controller('appointments')
export class AppointmentsController {
  constructor(private appointmentsService: AppointmentsService) {}

  // ─── Public: Check available slots ────────────────────────────────────────

  @Get('slots')
  @ApiOperation({ summary: 'Get available time slots for a service/staff/date combo' })
  @ApiQuery({ name: 'salonId', required: true })
  @ApiQuery({ name: 'serviceId', required: true })
  @ApiQuery({ name: 'staffId', required: true })
  @ApiQuery({ name: 'date', required: true, example: '2025-07-15' })
  getSlots(
    @Query('salonId') salonId: string,
    @Query('serviceId') serviceId: string,
    @Query('staffId') staffId: string,
    @Query('date') date: string,
  ) {
    return this.appointmentsService.getAvailableSlots(salonId, serviceId, staffId, date);
  }

  // ─── Customer: Book ────────────────────────────────────────────────────────

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Book an appointment' })
  create(@CurrentUser('id') customerId: string, @Body() dto: CreateAppointmentDto) {
    return this.appointmentsService.create(customerId, dto);
  }

  // ─── Customer: My appointments ─────────────────────────────────────────────

  @Get('my')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get my appointments' })
  @ApiQuery({ name: 'status', required: false })
  myAppointments(@CurrentUser('id') customerId: string, @Query('status') status?: string) {
    return this.appointmentsService.findByCustomer(customerId, status);
  }

  // ─── Customer: Cancel ──────────────────────────────────────────────────────

  @Put(':id/cancel')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cancel an appointment' })
  cancel(
    @Param('id') id: string,
    @CurrentUser('id') customerId: string,
    @Body('reason') reason?: string,
  ) {
    return this.appointmentsService.cancel(id, customerId, reason);
  }

  // ─── Salon: View calendar ──────────────────────────────────────────────────

  @Get('salon/:salonId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SALON_OWNER, Role.MANAGER, Role.EMPLOYEE, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all salon appointments in a date range' })
  salonAppointments(
    @Param('salonId') salonId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.appointmentsService.findBySalon(salonId, from, to);
  }

  // ─── Salon: Update status ──────────────────────────────────────────────────

  @Put(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SALON_OWNER, Role.MANAGER, Role.EMPLOYEE, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update appointment status (confirm, complete, reject, no-show)' })
  updateStatus(
    @Param('id') id: string,
    @Body('status') status: string,
    @Body('salonId') salonId: string,
  ) {
    return this.appointmentsService.updateStatus(id, status, salonId);
  }
}
