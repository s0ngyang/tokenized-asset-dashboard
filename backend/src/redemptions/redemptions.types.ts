export interface RedemptionRecord {
  id: string;
  walletAddress: string;
  tokenAddress: string;
  amount: string;
  nonce: string;
  signature: string;
  status: string;
  createdAt: string;
}
