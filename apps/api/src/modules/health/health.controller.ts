import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  /** Liveness. Answers as long as the process is up. */
  @Get()
  live(): { ok: true } {
    return { ok: true };
  }

  /**
   * Readiness. Answers only when the database answers too, so a rolling deploy
   * does not send traffic to an instance that cannot serve it.
   */
  @Get('ready')
  async ready(): Promise<{ ok: boolean; database: 'up' | 'down' }> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { ok: true, database: 'up' };
    } catch {
      return { ok: false, database: 'down' };
    }
  }
}
