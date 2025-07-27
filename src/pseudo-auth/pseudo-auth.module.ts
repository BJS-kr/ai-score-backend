import { Module } from '@nestjs/common';
import { PseudoAuthController } from './pseudo-auth.controller';

@Module({
  controllers: [PseudoAuthController],
})
export class PseudoAuthModule {}
