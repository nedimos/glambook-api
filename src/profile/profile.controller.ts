import { Controller, Get, Put, UseGuards, Body, UploadedFile, Post, UseInterceptors, Req } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { JwtAuthGuard } from '../common/guards/auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ProfileService } from './profile.service';
import { UpdateProfileDto } from './profile.dto';
import * as path from 'path';
import * as fs from 'fs';

@Controller('me')
export class ProfileController {
  constructor(private profile: ProfileService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  async get(@CurrentUser('id') userId: string) {
    return this.profile.getProfile(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Put()
  async update(@CurrentUser('id') userId: string, @Body() dto: UpdateProfileDto) {
    return this.profile.updateProfile(userId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('avatar')
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: (req, file, cb) => {
        const uploadPath = path.join(process.cwd(), 'uploads');
        if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath, { recursive: true });
        cb(null, uploadPath);
      },
      filename: (_req, file, cb) => {
        const ext = path.extname(file.originalname);
        const name = `${Date.now()}-${Math.random().toString(36).slice(2,8)}${ext}`;
        cb(null, name);
      },
    }),
  }))
  async uploadAvatar(@CurrentUser('id') userId: string, @UploadedFile() file: Express.Multer.File, @Req() req: any) {
    if (!file) return { url: null };
    const url = `${req.protocol}://${req.get('host')}/uploads/${file.filename}`;
    return this.profile.updateAvatar(userId, url);
  }
}
