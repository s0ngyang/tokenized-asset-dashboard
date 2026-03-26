import type { TypedDataDomain, TypedDataField } from 'ethers';

export const SEPOLIA_CHAIN_ID = 11155111;
export const TEST_TOKEN_ADDRESS = '0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8';
export const DEFAULT_SEPOLIA_RPC_URL =
  'https://sepolia.infura.io/v3/5f647272f1f748318f633d082b296542';

export const ERC20_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'event Transfer(address indexed from, address indexed to, uint256 value)',
];

export const REDEMPTION_DOMAIN: TypedDataDomain = {
  name: 'TokenizedAssetDashboard',
  version: '1',
  chainId: SEPOLIA_CHAIN_ID,
};

export const REDEMPTION_TYPES: Record<string, TypedDataField[]> = {
  RedemptionRequest: [
    { name: 'walletAddress', type: 'address' },
    { name: 'tokenAddress', type: 'address' },
    { name: 'amount', type: 'uint256' },
    { name: 'nonce', type: 'uint256' },
  ],
};
