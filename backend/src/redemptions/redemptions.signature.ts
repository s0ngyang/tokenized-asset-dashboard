import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { getAddress, verifyTypedData } from 'ethers';
import { CreateRedemptionDto } from './dto/create-redemption.dto';
import { REDEMPTION_DOMAIN, REDEMPTION_TYPES } from './redemptions.constants';

export function recoverRedemptionSigner(payload: CreateRedemptionDto): string {
  try {
    return getAddress(
      verifyTypedData(
        REDEMPTION_DOMAIN,
        REDEMPTION_TYPES,
        {
          walletAddress: payload.walletAddress,
          tokenAddress: payload.tokenAddress,
          amount: BigInt(payload.amount),
          nonce: BigInt(payload.nonce),
        },
        payload.signature,
      ),
    );
  } catch (error) {
    throw new BadRequestException('Invalid redemption signature payload');
  }
}

export function assertMatchingWallet(payload: CreateRedemptionDto): string {
  const recoveredSigner = recoverRedemptionSigner(payload);
  const normalizedWallet = getAddress(payload.walletAddress);

  if (recoveredSigner !== normalizedWallet) {
    throw new UnauthorizedException('Signature does not match walletAddress');
  }

  return recoveredSigner;
}
