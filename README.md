# Tokenized Asset Dashboard

Mini full-stack dashboard for the Libeara take-home assignment. The app lets an investor connect a MetaMask wallet, view the connected chain's native balance, track the Sepolia test USDC token used in the exercise, calculate portfolio value from a fixed NAV, and submit signed off-chain redemption requests that are verified by a NestJS backend.

## Stack

- Frontend: React + Vite + TypeScript + Tailwind
- Backend: NestJS + TypeScript
- Blockchain library: `ethers` v6
- Network: Ethereum Sepolia

## Project Structure

```text
tokenized-asset-dashboard/
├── frontend/   # React app
├── backend/    # NestJS API
└── README.md
```

## Setup

### 1. Install dependencies

From the repo root:

```bash
pnpm install
```

### 2. Configure environment variables

Frontend:

```bash
cp frontend/.env.example frontend/.env
```

Backend:

```bash
cp backend/.env.example backend/.env
```

Default values already point at a Sepolia Infura RPC and the local backend/frontend URLs.

### 3. Run the backend

```bash
pnpm dev:backend
```

The API will start on `http://localhost:3000`.

### 4. Run the frontend

In a second terminal:

```bash
pnpm dev:frontend
```

The app will start on `http://localhost:5173`.

## Features Implemented

### Frontend

- MetaMask wallet connection using `window.ethereum` and `ethers.BrowserProvider`
- Graceful handling for disconnects, account changes, chain changes, reconnect on refresh, and manual disconnect state reset
- Display of the connected chain's native token balance
- Display of the Sepolia test USDC token balance for `0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8`
- Token symbol, token address, and decimal-aware formatting
- Portfolio value calculation using hardcoded NAV of `$1.0023` for the Sepolia redemption asset
- Redemption form with client-side validation
- EIP-712 signing with the required domain and type definitions
- POST integration to the backend
- Feedback state, Sepolia switch guidance, and redemption history display

### Backend

- `POST /redemptions`
- `GET /redemptions/:walletAddress`
- DTO validation with `class-validator`
- EIP-712 signature recovery with `ethers.verifyTypedData`
- Signature-to-wallet matching with `401` on mismatch
- On-chain `balanceOf` validation against Sepolia USDC
- In-memory storage with generated UUIDs and `pending` status
- Sorted redemption history, newest first
- Global validation pipe and meaningful HTTP errors

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
- Used a Sepolia Infura RPC by default to reduce setup friction, while still allowing override through `.env`.

## Assumptions

- MetaMask is installed in the browser used for testing.
- Redemptions are off-chain requests only and do not trigger an on-chain transaction.
- The frontend and backend both track only the provided Sepolia USDC token for redemption requests.

## Approximate Time Spent

About 4.5 hours for scaffold, core implementation, validation, tests, and documentation.
