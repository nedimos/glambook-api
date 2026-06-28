import {
  Controller, Get, Post, Put, Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SalonsService } from './salons.service';
import { CreateSalonDto, UpdateSalonDto, SalonQueryDto } from './salons.dto';
import { JwtAuthGuard, RolesGuard, Roles } from '../common/guards/auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '@prisma/client';

@ApiTags('Salons')
@Controller('salons')
export class SalonsController {
  constructor(private salonsService: SalonsService) {}

  // ─── Public ────────────────────────────────────────────────────────────────

  @Get()
  @ApiOperation({ summary: 'Browse all active salons with filters' })
  findAll(@Query() query: SalonQueryDto) {
    return this.salonsService.findAll(query);
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Get salon detail by slug' })
  findOne(@Param('slug') slug: string) {
    return this.salonsService.findOne(slug);
  }

  // ─── Owner ─────────────────────────────────────────────────────────────────

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SALON_OWNER, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new salon (owner only)' })
  create(@CurrentUser('id') ownerId: string, @Body() dto: CreateSalonDto) {
    return this.salonsService.create(ownerId, dto);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SALON_OWNER, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update salon info (owner only)' })
  update(
    @Param('id') id: string,
    @CurrentUser('id') ownerId: string,
    @Body() dto: UpdateSalonDto,
  ) {
    return this.salonsService.update(id, ownerId, dto);
  }

  @Get('owner/my-salons')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SALON_OWNER, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get owner's salons" })
  mySalons(@CurrentUser('id') ownerId: string) {
    return this.salonsService.findByOwner(ownerId);
  }

  @Get(':id/dashboard')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SALON_OWNER, Role.ADMIN, Role.MANAGER)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get salon dashboard stats and today's appointments" })
  dashboard(@Param('id') id: string, @CurrentUser('id') ownerId: string) {
    return this.salonsService.getDashboardStats(id, ownerId);
  }
}
