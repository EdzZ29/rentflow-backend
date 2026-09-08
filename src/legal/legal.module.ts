import { Module } from '@nestjs/common';
import { LegalController } from './legal.controller';

// Static content only — no entities, no service.
@Module({ controllers: [LegalController] })
export class LegalModule {}
