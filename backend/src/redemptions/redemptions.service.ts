import { BadRequestException, Injectable } from "@nestjs/common";
import { randomUUID } from "crypto";
import { Contract, JsonRpcProvider, getAddress } from "ethers";
import { CreateRedemptionDto } from "./dto/create-redemption.dto";
import { DEFAULT_SEPOLIA_RPC_URL, ERC20_ABI, TEST_TOKEN_ADDRESS } from "./redemptions.constants";
import { assertMatchingWallet } from "./redemptions.signature";
import { RedemptionRecord } from "./redemptions.types";

@Injectable()
export class RedemptionsService {
  private readonly records: RedemptionRecord[] = [];

  private readonly provider = new JsonRpcProvider(process.env.SEPOLIA_RPC_URL ?? DEFAULT_SEPOLIA_RPC_URL);

  async create(payload: CreateRedemptionDto): Promise<RedemptionRecord> {
    const walletAddress = getAddress(payload.walletAddress);
    const tokenAddress = getAddress(payload.tokenAddress);
    const amount = BigInt(payload.amount);

    if (amount <= 0n) {
      throw new BadRequestException("Amount must be greater than zero");
    }

    if (tokenAddress !== getAddress(TEST_TOKEN_ADDRESS)) {
      throw new BadRequestException("Token must be the Sepolia USDC token");
    }

    assertMatchingWallet({
      ...payload,
      walletAddress,
      tokenAddress,
    });

    const contract = new Contract(tokenAddress, ERC20_ABI, this.provider);
    const balance = BigInt(await contract.balanceOf(walletAddress));

    if (amount > balance) {
      throw new BadRequestException("Requested amount exceeds on-chain token balance");
    }

    const record: RedemptionRecord = {
      id: randomUUID(),
      walletAddress,
      tokenAddress,
      amount: amount.toString(),
      nonce: BigInt(payload.nonce).toString(),
      signature: payload.signature,
      status: "Pending",
      createdAt: new Date().toISOString(),
    };

    this.records.push(record);

    return record;
  }

  findByWallet(walletAddress: string): RedemptionRecord[] {
    const normalizedWallet = getAddress(walletAddress);

    return this.records
      .filter((record) => record.walletAddress === normalizedWallet)
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  }
}
