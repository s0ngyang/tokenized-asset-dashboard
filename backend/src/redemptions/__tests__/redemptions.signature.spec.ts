import { Wallet } from 'ethers';
import { CreateRedemptionDto } from '../dto/create-redemption.dto';
import {
  REDEMPTION_DOMAIN,
  REDEMPTION_TYPES,
  TEST_TOKEN_ADDRESS,
} from '../redemptions.constants';
import {
  assertMatchingWallet,
  recoverRedemptionSigner,
} from '../redemptions.signature';

describe('redemption signature validation', () => {
  it('recovers the signer from a valid EIP-712 signature', async () => {
    const wallet = Wallet.createRandom();
    const amount = '2500000';
    const nonce = '1735689600';

    const signature = await wallet.signTypedData(REDEMPTION_DOMAIN, REDEMPTION_TYPES, {
      walletAddress: wallet.address,
      tokenAddress: TEST_TOKEN_ADDRESS,
      amount: BigInt(amount),
      nonce: BigInt(nonce),
    });

    const payload: CreateRedemptionDto = {
      walletAddress: wallet.address,
      tokenAddress: TEST_TOKEN_ADDRESS,
      amount,
      nonce,
      signature,
    };

    expect(recoverRedemptionSigner(payload)).toBe(wallet.address);
    expect(assertMatchingWallet(payload)).toBe(wallet.address);
  });

  it('throws when the signature does not match walletAddress', async () => {
    const signer = Wallet.createRandom();
    const otherWallet = Wallet.createRandom();

    const signature = await signer.signTypedData(REDEMPTION_DOMAIN, REDEMPTION_TYPES, {
      walletAddress: signer.address,
      tokenAddress: TEST_TOKEN_ADDRESS,
      amount: 10n,
      nonce: 1n,
    });

    const payload: CreateRedemptionDto = {
      walletAddress: otherWallet.address,
      tokenAddress: TEST_TOKEN_ADDRESS,
      amount: '10',
      nonce: '1',
      signature,
    };

    expect(() => assertMatchingWallet(payload)).toThrow(
      'Signature does not match walletAddress',
    );
  });
});
