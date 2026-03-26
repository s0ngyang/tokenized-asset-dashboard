import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Post,
  Body,
} from '@nestjs/common';
import { getAddress } from 'ethers';
import { CreateRedemptionDto } from './dto/create-redemption.dto';
import { RedemptionsService } from './redemptions.service';

@Controller('redemptions')
export class RedemptionsController {
  constructor(private readonly redemptionsService: RedemptionsService) {}

  @Post()
  create(@Body() createRedemptionDto: CreateRedemptionDto) {
    return this.redemptionsService.create(createRedemptionDto);
  }

  @Get(':walletAddress')
  findByWallet(@Param('walletAddress') walletAddress: string) {
    try {
      return this.redemptionsService.findByWallet(getAddress(walletAddress));
    } catch (error) {
      throw new BadRequestException('walletAddress must be a valid Ethereum address');
    }
  }
}
