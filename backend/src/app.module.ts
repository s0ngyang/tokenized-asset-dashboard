import { Module } from '@nestjs/common';
import { RedemptionsModule } from './redemptions/redemptions.module';

@Module({
  imports: [RedemptionsModule],
})
export class AppModule {}
