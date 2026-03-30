# Tokenized Asset Dashboard

- Frontend: React + Vite + TypeScript + Tailwind
- Backend: NestJS + TypeScript
- Blockchain library: `ethers` v6
- Network: Ethereum Sepolia

## Video Walkthrough

https://drive.google.com/file/d/1alef2QyzYaaffSAZQwhOC1MUy0PVYBpp/view?usp=sharing

## Setup

### 1. Install dependencies

From the repo root:

```bash
pnpm install
```

### 2. Run the backend

```bash
pnpm dev:backend
```

The server will listen on `http://localhost:3000`.

### 3. Run the frontend

In a second terminal:

```bash
pnpm dev:frontend
```

The app will start on `http://localhost:5173`.

## Features Implemented

### Core Requirements

Frontend

1. Wallet Connection
2. Balance Display
3. Portfolio Display
4. Redemption Request Form

Backend

1. POST /redemptions — Create a redemption request
2. GET /redemptions/:walletAddress — List redemption requests
3. Validation and Error Handling

Unit tests

1. Recovers the signer from a valid EIP-712 signature
2. Throws when the signature does not match walletAddress

### Bonus

None

## API Contract

### POST `/redemptions`

Request body:

```json
{
  "walletAddress": "0x...",
  "tokenAddress": "0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8",
  "amount": "1000000",
  "nonce": "1735689600",
  "signature": "0x..."
}
```

Response:

```json
{
  "id": "uuid",
  "walletAddress": "0x...",
  "tokenAddress": "0x...",
  "amount": "1000000",
  "nonce": "1735689600",
  "signature": "0x...",
  "status": "pending",
  "createdAt": "2026-03-25T00:00:00.000Z"
}
```

### GET `/redemptions/:walletAddress`

Returns all redemption requests for the wallet, newest first.

## EIP-712 Configuration

Frontend and backend use the same typed data structure:

```ts
const domain = {
  name: "TokenizedAssetDashboard",
  version: "1",
  chainId: 11155111,
};

const types = {
  RedemptionRequest: [
    { name: "walletAddress", type: "address" },
    { name: "tokenAddress", type: "address" },
    { name: "amount", type: "uint256" },
    { name: "nonce", type: "uint256" },
  ],
};
```

## Testing

Run the required backend unit tests with:

```bash
pnpm test:backend
```

Included tests cover EIP-712 signature recovery and signature mismatch handling.

## Architecture Decisions and Tradeoffs

- Used a lightweight pnpm workspace monorepo so frontend and backend can stay isolated while sharing one install.
- Used Vite instead of Next.js to keep the frontend focused and fast.
- Stored redemption requests in memory because persistence is not required.
- Kept the Sepolia USDC token address fixed in the backend to avoid accepting arbitrary ERC-20 contracts.
- Used Sepolia Infura RPC as the other two providers did not work for me.

## Assumptions

- MetaMask is installed in the browser used for testing.
- Redemptions are off-chain requests only and do not trigger an on-chain transaction.
- The frontend and backend both track only the provided Sepolia USDC token for redemption requests.

## Approximate Time Spent

About 4.5 hours for scaffold, core implementation, validation, tests, and documentation.
