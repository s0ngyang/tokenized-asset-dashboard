export interface RedemptionRecord {
  id: string;
  walletAddress: string;
  tokenAddress: string;
  amount: string;
  nonce: string;
  signature: string;
  status: 'pending';
  createdAt: string;
}
