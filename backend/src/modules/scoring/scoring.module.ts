import { Module } from '@nestjs/common';
import { ScoringController } from './scoring.controller';
import { ScoringService } from './scoring.service';
import { ScoringGateway } from './scoring.gateway';

@Module({
  controllers: [ScoringController],
  providers: [ScoringService, ScoringGateway],
  exports: [ScoringService, ScoringGateway],
})
export class ScoringModule {}
