import { IsEthereumAddress, IsNotEmpty, IsString, Matches } from 'class-validator';

const UNSIGNED_INTEGER_PATTERN = /^\d+$/;

export class CreateRedemptionDto {
  @IsEthereumAddress()
  walletAddress!: string;

  @IsEthereumAddress()
  tokenAddress!: string;

  @IsString()
  @IsNotEmpty()
  @Matches(UNSIGNED_INTEGER_PATTERN, {
    message: 'amount must be a base-10 unsigned integer string',
  })
  amount!: string;

  @IsString()
  @IsNotEmpty()
  @Matches(UNSIGNED_INTEGER_PATTERN, {
    message: 'nonce must be a base-10 unsigned integer string',
  })
  nonce!: string;

  @IsString()
  @IsNotEmpty()
  signature!: string;
}
