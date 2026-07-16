import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CmsService } from './cms.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@ApiTags('CMS')
@Controller('cms')
export class CmsController {
  constructor(private readonly cmsService: CmsService) {}

  // ── Documents (public read, admin write) ──
  @Get('documents')
  @ApiOperation({ summary: 'Liste des documents publics' })
  async getDocuments(@Query('category') category?: string) {
    return this.cmsService.getDocuments(category);
  }

  @Post('documents')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Ajouter un document' })
  async createDocument(@Body() body: { title: string; category: string; fileName: string; fileUrl: string }) {
    return this.cmsService.createDocument(body);
  }

  @Delete('documents/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async deleteDocument(@Param('id') id: string) {
    return this.cmsService.deleteDocument(id);
  }

  // ── Featured Media (public read, admin write) ──
  @Get('featured-media')
  @ApiOperation({ summary: 'Images à la une' })
  async getFeaturedMedia() {
    return this.cmsService.getFeaturedMedia();
  }

  @Post('featured-media')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async addFeaturedMedia(@Body() body: { title?: string; description?: string; imageUrl: string; competitionId?: string }) {
    return this.cmsService.addFeaturedMedia(body);
  }

  @Patch('featured-media/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async updateFeaturedMedia(@Param('id') id: string, @Body() body: { title?: string; description?: string; sortOrder?: number }) {
    return this.cmsService.updateFeaturedMedia(id, body);
  }

  @Delete('featured-media/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async deleteFeaturedMedia(@Param('id') id: string) {
    return this.cmsService.deleteFeaturedMedia(id);
  }

  // ── Competition visibility ──
  @Patch('competitions/:id/toggle-visibility')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async toggleVisibility(@Param('id') id: string) {
    return this.cmsService.toggleCompetitionVisibility(id);
  }

  // ── Articles (public read, admin write) ──
  @Get('articles')
  @ApiOperation({ summary: 'Liste des actualités (admin, toutes)' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async getAllArticles() {
    return this.cmsService.getAllArticles();
  }

  @Post('articles')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Créer une actualité' })
  async createArticle(@Body() body: { title: string; excerpt: string; content?: string; category: string; imageUrl?: string; isPublished?: boolean }) {
    return this.cmsService.createArticle(body);
  }

  @Patch('articles/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Modifier une actualité' })
  async updateArticle(@Param('id') id: string, @Body() body: { title?: string; excerpt?: string; content?: string; category?: string; imageUrl?: string; isPublished?: boolean }) {
    return this.cmsService.updateArticle(id, body);
  }

  @Delete('articles/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Supprimer une actualité' })
  async deleteArticle(@Param('id') id: string) {
    return this.cmsService.deleteArticle(id);
  }
}
