import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CmsService {
  constructor(private prisma: PrismaService) {}

  // ── Documents ──
  async getDocuments(category?: string) {
    const where: any = {};
    if (category) where.category = category;
    const docs = await this.prisma.document.findMany({ where, orderBy: { category: 'asc' } });
    return { data: docs };
  }

  async createDocument(data: { title: string; category: string; fileName: string; fileUrl: string }) {
    const doc = await this.prisma.document.create({ data });
    return { message: 'Document ajouté', data: doc };
  }

  async deleteDocument(id: string) {
    const doc = await this.prisma.document.findUnique({ where: { id } });
    if (!doc) throw new NotFoundException('Document non trouvé');
    await this.prisma.document.delete({ where: { id } });
    return { message: 'Document supprimé' };
  }

  // ── Featured Media ──
  async getFeaturedMedia() {
    const media = await this.prisma.featuredMedia.findMany({
      orderBy: { sortOrder: 'asc' },
      include: { competition: { select: { id: true, name: true } } },
    });
    return { data: media };
  }

  async addFeaturedMedia(data: { title?: string; description?: string; imageUrl: string; competitionId?: string }) {
    const count = await this.prisma.featuredMedia.count();
    const media = await this.prisma.featuredMedia.create({
      data: { ...data, sortOrder: count },
    });
    return { message: 'Image ajoutée', data: media };
  }

  async updateFeaturedMedia(id: string, data: { title?: string; description?: string; sortOrder?: number }) {
    await this.prisma.featuredMedia.update({ where: { id }, data });
    return { message: 'Mis à jour' };
  }

  async deleteFeaturedMedia(id: string) {
    await this.prisma.featuredMedia.delete({ where: { id } });
    return { message: 'Supprimé' };
  }

  // ── Competition visibility ──
  async toggleCompetitionVisibility(competitionId: string) {
    const comp = await this.prisma.competition.findUnique({ where: { id: competitionId } });
    if (!comp) throw new NotFoundException('Compétition non trouvée');
    const updated = await this.prisma.competition.update({
      where: { id: competitionId },
      data: { isPublic: !comp.isPublic },
    });
    return { message: updated.isPublic ? 'Compétition visible' : 'Compétition masquée', data: updated };
  }

  // ── Articles / News ──
  async getArticles() {
    const articles = await this.prisma.article.findMany({
      where: { isPublished: true },
      orderBy: { publishedAt: 'desc' },
    });
    return { data: articles };
  }

  async getAllArticles() {
    const articles = await this.prisma.article.findMany({
      orderBy: { publishedAt: 'desc' },
    });
    return { data: articles };
  }

  async createArticle(data: { title: string; excerpt: string; content?: string; category: string; imageUrl?: string; isPublished?: boolean }) {
    const article = await this.prisma.article.create({
      data: {
        title: data.title,
        excerpt: data.excerpt,
        content: data.content || null,
        category: data.category,
        imageUrl: data.imageUrl || null,
        isPublished: data.isPublished !== false,
      },
    });
    return { message: 'Actualité créée', data: article };
  }

  async updateArticle(id: string, data: { title?: string; excerpt?: string; content?: string; category?: string; imageUrl?: string; isPublished?: boolean }) {
    const article = await this.prisma.article.findUnique({ where: { id } });
    if (!article) throw new NotFoundException('Actualité non trouvée');
    const updated = await this.prisma.article.update({ where: { id }, data });
    return { message: 'Actualité mise à jour', data: updated };
  }

  async deleteArticle(id: string) {
    const article = await this.prisma.article.findUnique({ where: { id } });
    if (!article) throw new NotFoundException('Actualité non trouvée');
    await this.prisma.article.delete({ where: { id } });
    return { message: 'Actualité supprimée' };
  }
}
