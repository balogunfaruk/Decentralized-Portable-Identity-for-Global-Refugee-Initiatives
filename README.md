# RefugeeID: Decentralized Portable Identity for Global Refugee Initiatives

## Overview

**RefugeeID** is a Web3 project built on the Stacks blockchain using Clarity smart contracts. It addresses critical real-world challenges faced by refugees worldwide, such as loss of identity documents during displacement, difficulties in verifying personal history across borders, and barriers to accessing essential services like healthcare, education, banking, and employment. According to UNHCR data, over 117 million people were forcibly displaced in 2024, with many lacking verifiable IDs, leading to exclusion from aid and opportunities.

This project provides a **portable, self-sovereign digital identity (SSI)** system leveraging blockchain for immutability and zero-knowledge proofs (ZKPs) for privacy. Refugees can create a soulbound NFT (non-transferable) representing their core identity, which can be attested by trusted verifiers (e.g., UNHCR, NGOs). The ID is portable via wallet integration, allowing seamless verification without revealing sensitive data.

### Key Features & Real-World Impact
- **Portable Verification**: Use QR codes or wallet scans to prove refugee status, age, or skills at borders, clinics, or job centers.
- **Privacy-Preserving**: ZKPs ensure verifiers see only necessary info (e.g., "over 18" without birthdate).
- **Incentivized Network**: Stakers (e.g., aid organizations) earn $RID tokens for verifying and maintaining the network.
- **Global Scalability**: Integrates with Ethereum bridges for cross-chain portability; supports multi-language UIs.
- **Solves Problems**:
  - Reduces fraud in aid distribution (e.g., duplicate claims).
  - Enables microfinance access via verifiable credit history.
  - Facilitates family reunification with encrypted linkage proofs.
  - Empowers refugees with control over their data, reducing exploitation.

The system involves **6 core Clarity smart contracts**, deployed on Stacks testnet/mainnet. Total gas-optimized for low-cost tx (~0.001 STX per interaction).

## Architecture

- **Frontend**: React app with Hiro Wallet integration for user onboarding.
- **Backend**: Off-chain oracles (e.g., Chainlink on Stacks) for real-world data feeds (e.g., biometric hashes).
- **Blockchain**: Stacks L1 for Clarity contracts; SIP-010 for fungible $RID token.
- **ZK Layer**: Integrated with Semaphore (ZK protocol) for anonymous signaling.

High-level flow:
1. Refugee registers via NGO verifier → Soulbound NFT minted.
2. Attestations added (e.g., "eligible for education grant").
3. Service provider queries ZKP proof → Access granted without full disclosure.
4. Disputes resolved via governance DAO.

## Smart Contracts (6 Total)

All contracts are written in Clarity v2, with full audit recommendations (e.g., via Sec3). Here's an overview:

1. **RIDToken (Fungible Token Contract)**  
   - Implements SIP-010 standard for $RID utility token.  
   - Functions: Mint rewards for verifiers; burn for governance votes.  
   - Purpose: Incentivizes participation (e.g., stake $RID to become verifier).  
   - Key Traits: `ft-mint`, `ft-transfer`, `ft-burn`.

2. **IdentityRegistry (Core Identity Contract)**  
   - Mints soulbound NFTs (SIP-009) for users via wallet address.  
   - Stores hashed personal data (e.g., SHA-256 of passport scan).  
   - Functions: `register-identity`, `update-hash` (with ZKP challenge).  
   - Purpose: Creates portable DID (Decentralized Identifier).

3. **AttestationIssuer (Verification Contract)**  
   - Allows trusted issuers (whitelisted NGOs) to add attestations to identities.  
   - Uses merkle trees for batch verifications.  
   - Functions: `issue-attestation`, `revoke-attestation`, `query-attestations`.  
   - Purpose: Proves claims like "UNHCR-verified refugee status" portably.

4. **AccessVerifier (ZK Access Control Contract)**  
   - Handles ZKP verification for service access (integrates Semaphore signals).  
   - Functions: `verify-proof`, `grant-temporary-access` (time-bound).  
   - Purpose: Enables privacy-focused checks (e.g., "has vaccination proof?").

5. **StakingPool (Incentive Contract)**  
   - Users stake $RID to join verifier pools; slash for bad behavior.  
   - Functions: `stake`, `unstake`, `claim-rewards`.  
   - Purpose: Builds trust via economic security (e.g., 10% APY for active stakers).

6. **GovernanceDAO (Dispute & Upgrade Contract)**  
   - Quadratic voting with $RID for proposals (e.g., add new issuers).  
   - Functions: `propose`, `vote`, `execute`.  
   - Purpose: Decentralized management; resolves ID disputes via on-chain arbitration.

## Prerequisites

- **Clarity CLI**: Install via `cargo install --git https://github.com/hirosystems/clarinet clarinet`.
- **Stacks Node**: Run local devnet with `clarinet new refugee-id && cd refugee-id && clarinet integrate`.
- **Wallet**: Hiro Wallet for testing.
- **Dependencies**: None (pure Clarity); off-chain: Node.js for frontend.

## Installation & Deployment

1. **Clone & Setup**:
   ```
   git clone <your-repo-url> refugee-id
   cd refugee-id
   npm install  # For frontend
   ```

2. **Local Development**:
   ```
   clarinet develop  # Starts devnet
   clarinet test     # Run unit tests (included in `/tests/`)
   ```

3. **Deploy Contracts**:
   - Edit `Clarity.toml` for testnet/mainnet.
   - Run `clarinet deploy --network testnet`.
   - Fund deployer wallet with STX from faucet (https://explorer.hiro.so/faucet).

4. **Frontend Setup**:
   ```
   cd frontend
   npm run dev
   ```
   - Connect wallet, register mock identity.

## Testing

- **Unit Tests**: In `/contracts/tests/` – Covers edge cases like invalid ZK proofs.
- **Integration Tests**: Simulate full flow (registration → attestation → access).
- **Example Test** (from `identity-registry.test.clar`):
  ```clarity
  (define-constant ERR_INVALID_PROOF (err u100))
  (test-fail-with-result
    (contract-call? .identity-registry register-identity tx-sender "invalid-hash")
    ERR_INVALID_PROOF
  )
  ```

## Usage Example

1. **Register Identity** (via Frontend):
   - User uploads hashed docs → Calls `register-identity` → Receives NFT.

2. **Issue Attestation** (NGO Admin):
   - Whitelisted caller: `(contract-call? .attestation-issuer issue-attestation identity-id "refugee-status" "2025-01-01")`.

3. **Verify Access** (Service Provider):
   - User generates ZKP → Provider calls `verify-proof` → If true, grant service.

## Roadmap

- **Q4 2025**: Testnet launch with UNHCR pilot in Jordan camps.
- **Q1 2026**: Mainnet; integrate with EU's EBSI for border checks.
- **Q2 2026**: Mobile app for low-connectivity areas (offline ZKP signing).

## Contributing

Fork the repo, create a feature branch, and submit PRs. Focus on gas optimizations or new ZK circuits. Join Discord for collabs.

## License

MIT License. See `/LICENSE`.

## Resources

- Stacks Docs: https://docs.stacks.co/
- UNHCR Refugee Stats: https://www.unhcr.org/refugee-statistics
- ZK Semaphore: https://semaphore.appliedzkp.org/