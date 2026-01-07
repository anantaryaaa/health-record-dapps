# Medichain - Decentralized Health Record Management System

A blockchain-based health record management system built on Lisk Sepolia Testnet that enables secure, patient-controlled medical data sharing between healthcare institutions.

**Status:** Deployed on Lisk Sepolia Testnet (Chain ID: 4202)  
**Last Updated:** January 7, 2026

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Smart Contracts](#smart-contracts)
- [Features](#features)
- [Technology Stack](#technology-stack)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [User Flows](#user-flows)
- [API Endpoints](#api-endpoints)
- [Configuration](#configuration)
- [Development](#development)
- [Deployment](#deployment)

## Overview

Medichain is a decentralized health record management system that addresses the fragmentation of medical data across different healthcare providers. The system enables:

- Patients to maintain a single, portable health identity across multiple institutions
- Secure, encrypted storage of medical records on IPFS with blockchain verification
- Patient-controlled access permissions with automatic expiration
- Cross-device synchronization through on-chain profile storage
- Gasless transactions via ERC2771 meta-transaction forwarder
- Hospital profile management for transparency and verification

The system is built with a clear separation between patient data (stored locally per device for privacy) and profile/metadata (stored on-chain for cross-device sync).

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         MEDICHAIN ARCHITECTURE                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Frontend (Next.js)                                                          │
│  ├── Patient Dashboard (registration, profile, access management)           │
│  ├── Hospital Dashboard (patient search, record management)                 │
│  └── QR Code Scanner (patient discovery via QR)                             │
│                                                                              │
│  Backend Services                                                            │
│  ├── OCR API (Google Gemini - medical record extraction)                    │
│  ├── IPFS Integration (Pinata - medical record storage)                     │
│  └── Blockchain Services (contract interactions)                            │
│                                                                              │
│  Smart Contracts (Lisk Sepolia)                                             │
│  ├── MedichainPatientIdentity (SBT + Access Control + Medical Records)      │
│  ├── MedichainPatientProfile (Encrypted profile on-chain)                   │
│  ├── MedichainHospitalProfile (Hospital profile on-chain)                   │
│  ├── AutomatedHospitalRegistry (Hospital registration with gov signature)   │
│  └── MedichainForwarder (ERC2771 meta-transaction forwarder)                │
│                                                                              │
│  Storage                                                                     │
│  ├── IPFS (Pinata) - Medical records content                                │
│  ├── Blockchain - Identity, access permissions, profile metadata            │
│  └── LocalStorage - Patient data (per-device, for privacy)                  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Smart Contracts

All smart contracts are deployed on Lisk Sepolia Testnet (Chain ID: 4202).

### 1. MedichainPatientIdentity

**Address:** [0x19Ab8F63ED13ae191A8080c9638eefe86bF8ffbC](https://sepolia-blockscout.lisk.com/address/0x19Ab8F63ED13ae191A8080c9638eefe86bF8ffbC)

Core contract managing patient identity, access control, and medical records.

**Key Features:**
- Soulbound Token (SBT) - Non-transferable patient identity NFT
- Role-based access control (Admin, Hospital roles)
- Medical record management with IPFS references
- Access request workflow (request -> approve/reject)
- Access expiration and revocation

**Key Functions:**
- `selfRegister()` - Patient self-register for identity NFT
- `mintIdentity(address _patientWallet)` - Hospital mint identity for patient
- `grantAccess(address _accessor, string _accessType, uint256 _expiresAt)` - Patient grant access
- `revokeAccess(address _accessor)` - Patient revoke access
- `requestAccess(address _patient, string _hospitalName, uint256 _accessDuration, string _message)` - Hospital request access
- `approveAccessRequest(uint256 _requestIndex)` - Patient approve request
- `rejectAccessRequest(uint256 _requestIndex)` - Patient reject request
- `addMedicalRecord(address _patient, string _ipfsCid, bytes32 _dataHash, string _icd10Code, string _recordType)` - Add medical record
- `getPatientRecords(address _patient)` - Get all patient records
- `checkAccess(address _patient, address _accessor)` - Check access status
- `hasPatientIdentity(address _wallet)` - Check if wallet has identity

**Events:**
- IdentityMinted, AccessGranted, AccessRevoked, AccessRequested, AccessRequestApproved, AccessRequestRejected, RecordAdded, RecordVerified

### 2. MedichainPatientProfile

**Address:** [0x11dB04B254f4e355B07b53c53476b0d3bd864142](https://sepolia-blockscout.lisk.com/address/0x11dB04B254f4e355B07b53c53476b0d3bd864142)

Stores encrypted patient profile data on-chain for cross-device synchronization.

**Key Features:**
- Encrypted patient profile storage (bytes format)
- Access logging and audit trail
- Profile metadata (creation time, update time, data length)
- View-only functions without access logging

**Key Functions:**
- `setProfile(bytes _encryptedData)` - Set encrypted patient profile
- `updateProfile(bytes _encryptedData)` - Update encrypted patient profile
- `deleteProfile()` - Delete patient profile
- `getProfile(address _patient)` - Get encrypted profile (logs access)
- `getProfileView(address _patient)` - Get encrypted profile (view only, no logging)
- `getProfileMetadata(address _patient)` - Get profile metadata
- `hasProfile(address _patient)` - Check if patient has profile
- `getAccessHistory()` - Get access logs for caller's profile
- `getAccessHistoryFor(address _patient)` - Get access logs for specific patient

**Events:**
- ProfileCreated, ProfileUpdated, ProfileDeleted, ProfileAccessed

### 3. MedichainHospitalProfile

**Address:** [0x6040F415CBAd77722F8afF246a16471c10876C2d](https://sepolia-blockscout.lisk.com/address/0x6040F415CBAd77722F8afF246a16471c10876C2d)

Stores hospital profile data on-chain for transparency and verification.

**Key Features:**
- Hospital information storage (name, type, license, address, city, contact)
- Person in Charge (PIC) details
- Active/inactive status management
- Hospital enumeration by city
- Verification status tracking

**Key Functions:**
- `setProfile(string _hospitalType, string _physicalAddress, string _city, string _phone, string _picName, string _picPosition, string _picPhone, string _picEmail)` - Set hospital profile
- `updateProfile(...)` - Update hospital profile
- `getProfile(address _hospital)` - Get full hospital profile
- `getBasicInfo(address _hospital)` - Get basic info (name, type, city, verified, active)
- `getProfileMetadata(address _hospital)` - Get metadata
- `hasProfile(address _hospital)` - Check if hospital has profile
- `isHospitalActive(address _hospital)` - Check if hospital is active
- `deactivateProfile()` - Deactivate hospital profile
- `reactivateProfile()` - Reactivate hospital profile
- `getHospitalsByCity(string _city)` - Get hospitals by city
- `getTotalHospitals()` - Get total hospitals count

**Events:**
- ProfileCreated, ProfileUpdated, ProfileDeactivated, ProfileReactivated

### 4. AutomatedHospitalRegistry

**Address:** [0x7062ebd5d2796aEA3Aa03281e955994661080108](https://sepolia-blockscout.lisk.com/address/0x7062ebd5d2796aEA3Aa03281e955994661080108)

Hospital registration with government signature verification.

**Key Features:**
- ECDSA signature verification from government backend
- Hospital registration with license number
- Verification status tracking

**Key Functions:**
- `registerHospital(string _name, string _licenseNumber, bytes _signature)` - Register hospital with signature
- `getHospitalDetails(address _hospital)` - Get hospital details
- `isHospitalVerified(address _hospital)` - Check if hospital verified

**Events:**
- HospitalRegistered

### 5. MedichainForwarder

**Address:** [0xE2446A9d664bC4E160Af2b0F25BF6530b75250d5](https://sepolia-blockscout.lisk.com/address/0xE2446A9d664bC4E160Af2b0F25BF6530b75250d5)

ERC2771 meta-transaction forwarder enabling gasless transactions.

**Key Features:**
- Single and batch transaction execution
- Signature verification
- Fund management
- Gas tracking per user

**Key Functions:**
- `execute(ForwardRequestData _request)` - Execute single forward request
- `executeBatch(ForwardRequestData[] _requests, address _refundReceiver)` - Execute batch requests
- `verify(ForwardRequestData _request)` - Verify forward request signature
- `fund()` - Fund the forwarder (payable)
- `withdraw(address payable _to, uint256 _amount)` - Withdraw funds
- `getStats()` - Get forwarder stats

**Events:**
- ExecutedForwardRequest, MetaTransactionRelayed, RelayerFunded, FundsWithdrawn

## Features

### Patient Features

- **Self-Registration:** Patients can self-register to receive a Soulbound Token (SBT) identity
- **Profile Management:** Create and update encrypted profile for cross-device sync
- **Access Control:** Grant/revoke access to hospitals with custom duration
- **Medical Records:** View all medical records from different hospitals
- **Access Requests:** Approve or reject hospital access requests
- **QR Code Generation:** Generate QR code for hospital scanning

### Hospital Features

- **Patient Discovery:** Search patients by wallet address or QR code scan
- **Medical Records:** Add medical records with IPFS storage and ICD-10 codes
- **OCR Processing:** Automatic medical record extraction from images using Google Gemini
- **Access Requests:** Request access to patient records
- **Profile Management:** Create and update hospital profile on-chain
- **Record Verification:** Verify medical records on-chain

### Admin Features

- **Hospital Whitelist:** Whitelist hospitals for system access
- **Hospital Registration:** Register hospitals with government signature verification
- **System Management:** Manage system parameters and access control

## Technology Stack

### Frontend
- **Framework:** Next.js 16 with React 19
- **Styling:** Tailwind CSS 4
- **UI Components:** Radix UI, shadcn/ui
- **Forms:** React Hook Form with Zod validation
- **Web3:** Thirdweb SDK, Viem
- **QR Code:** jsqr, qrcode libraries
- **Icons:** Lucide React, React Icons, Web3 Icons

### Backend
- **Runtime:** Node.js with Next.js API routes
- **Blockchain:** Viem for contract interactions
- **IPFS:** Pinata for medical record storage
- **AI/ML:** Google Gemini 3 Flash for OCR
- **Authentication:** Wallet-based (no traditional auth)

### Smart Contracts
- **Language:** Solidity 0.8.24
- **Framework:** Foundry
- **Standards:** ERC721 (SBT), ERC2771 (Meta-transactions), OpenZeppelin AccessControl
- **Network:** Lisk Sepolia Testnet (Chain ID: 4202)

### Infrastructure
- **Blockchain:** Lisk Sepolia Testnet
- **RPC:** https://rpc.sepolia-api.lisk.com
- **Block Explorer:** https://sepolia-blockscout.lisk.com
- **IPFS Gateway:** Pinata (https://gateway.pinata.cloud/ipfs/)

## Getting Started

### Prerequisites

- Node.js 18+ and npm/pnpm
- MetaMask or compatible Web3 wallet
- Lisk Sepolia testnet configured in wallet
- Testnet LSK tokens for gas fees

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd medichain
```

2. Install dependencies:
```bash
npm install
# or
pnpm install
```

3. Configure environment variables:
```bash
cp .env.example .env.local
```

Update `.env.local` with:
- `NEXT_PUBLIC_THIRDWEB_CLIENT_ID` - Thirdweb client ID
- `NEXT_PUBLIC_CHAIN_ID` - 4202 (Lisk Sepolia)
- `NEXT_PUBLIC_RPC_URL` - https://rpc.sepolia-api.lisk.com
- `PINATA_API_KEY`, `PINATA_API_SECRET`, `PINATA_JWT` - Pinata credentials
- `GOOGLE_API_KEY` - Google Gemini API key
- `RELAYER_PRIVATE_KEY` - Admin private key for gasless transactions

4. Run development server:
```bash
npm run dev
```

Open http://localhost:3000 in your browser.

## Project Structure

```
medichain/
├── app/
│   ├── api/
│   │   ├── ocr/route.ts                 # Google Gemini OCR endpoint
│   │   ├── hospital/register/route.ts   # Hospital registration endpoint
│   │   └── ...
│   ├── auth/                            # Authentication pages
│   ├── dashboard/
│   │   ├── patient/                     # Patient dashboard
│   │   └── hospital/                    # Hospital dashboard
│   ├── layout.tsx                       # Root layout
│   ├── page.tsx                         # Landing page
│   └── globals.css                      # Global styles
│
├── components/
│   ├── patient-registration-form.tsx    # Patient registration
│   ├── patient-profile-section.tsx      # Patient profile display
│   ├── medical-history-section.tsx      # Medical records display
│   ├── pending-access-requests.tsx      # Access request management
│   ├── qr-scanner.tsx                   # QR code scanner
│   ├── patient-qr-code.tsx              # QR code generator
│   ├── add-patient-dialog.tsx           # Hospital patient search
│   ├── navbar.tsx                       # Navigation bar
│   ├── footer.tsx                       # Footer
│   ├── landing-hero-patient.tsx         # Patient landing section
│   ├── landing-hero-hospital.tsx        # Hospital landing section
│   ├── tech-stack.tsx                   # Technology stack display
│   ├── mvp-showcase.tsx                 # MVP features showcase
│   ├── user-flow.tsx                    # User flow diagram
│   └── ui/                              # Reusable UI components
│
├── lib/
│   ├── services/
│   │   ├── blockchain.ts                # Smart contract interactions
│   │   └── ipfs.ts                      # IPFS/Pinata integration
│   ├── contracts/
│   │   ├── config.ts                    # Contract addresses and ABIs
│   │   └── abi/                         # Contract ABIs
│   ├── patientStorage.ts                # LocalStorage utilities
│   └── utils.ts                         # Helper functions
│
├── abi/
│   ├── MedichainPatientIdentity.json
│   ├── MedichainPatientProfile.json
│   ├── MedichainHospitalProfile.json
│   ├── AutomatedHospitalRegistry.json
│   └── MedichainForwarder.json
│
├── smart-contract/                      # Smart contract source code
│   ├── src/
│   ├── script/
│   ├── test/
│   └── README.md
│
├── public/
│   └── assets/                          # Images and static files
│
├── .env                                 # Environment variables
├── package.json
├── tsconfig.json
├── tailwind.config.ts
└── README.md
```

## User Flows

### Patient Registration Flow

```
1. Patient visits landing page
2. Connects wallet (MetaMask)
3. Checks if already registered on blockchain
   - If yes: Shows "Sync Your Profile" form (no minting)
   - If no: Shows registration form with minting
4. Fills profile information
5. Submits registration
6. NFT minted on MedichainPatientIdentity contract
7. Profile saved to localStorage (per-device)
8. Optional: Save encrypted profile to MedichainPatientProfile contract
9. Redirected to patient dashboard
```

### Hospital Patient Discovery Flow

```
1. Hospital staff visits hospital dashboard
2. Searches patient by wallet address OR scans QR code
3. System checks:
   - If QR scan: Fetches full patient data from blockchain + localStorage
   - If manual entry: Checks blockchain only (limited data)
4. Displays patient information
5. Hospital can request access or view if already granted
6. If access granted: Can add medical records
```

### Medical Record Addition Flow

```
1. Hospital staff uploads medical record image
2. OCR API (Google Gemini) extracts data from image
3. Form auto-fills with extracted data
4. Hospital staff reviews and confirms
5. Record uploaded to IPFS (Pinata)
6. Record reference added to blockchain
7. Patient receives notification
8. Patient can verify record on-chain
```

### Access Request Flow

```
1. Hospital requests access to patient records
2. Patient receives notification
3. Patient approves/rejects request
4. If approved: Hospital granted access with expiration time
5. Hospital can now view patient records
6. Access automatically expires after duration
7. Patient can revoke access anytime
```

## API Endpoints

### OCR Endpoint

**POST** `/api/ocr`

Extract medical record data from image using Google Gemini.

Request:
```json
{
  "imageBase64": "data:image/jpeg;base64,..."
}
```

Response:
```json
{
  "diagnosis": "Hypertension",
  "icd10Code": "I10",
  "recordType": "DIAGNOSIS",
  "date": "2025-01-07",
  "hospital": "RS Harapan Kita",
  "notes": "Patient presents with elevated blood pressure..."
}
```

### Hospital Registration Endpoint

**POST** `/api/hospital/register`

Register hospital with government signature verification.

Request:
```json
{
  "hospitalName": "RS Harapan Kita",
  "licenseNumber": "RS-2024-001",
  "signature": "0x..."
}
```

Response:
```json
{
  "success": true,
  "transactionHash": "0x...",
  "hospitalAddress": "0x..."
}
```

## Configuration

### Environment Variables

```bash
# Thirdweb Configuration
NEXT_PUBLIC_THIRDWEB_CLIENT_ID=<your-client-id>

# Blockchain Configuration
NEXT_PUBLIC_CHAIN_ID=4202
NEXT_PUBLIC_RPC_URL=https://rpc.sepolia-api.lisk.com

# Smart Contract Addresses
NEXT_PUBLIC_MEDICHAIN_FORWARDER_ADDRESS=0xE2446A9d664bC4E160Af2b0F25BF6530b75250d5
NEXT_PUBLIC_HOSPITAL_REGISTRY_ADDRESS=0x7062ebd5d2796aEA3Aa03281e955994661080108
NEXT_PUBLIC_PATIENT_IDENTITY_ADDRESS=0x19Ab8F63ED13ae191A8080c9638eefe86bF8ffbC
NEXT_PUBLIC_PATIENT_PROFILE_ADDRESS=0x11dB04B254f4e355B07b53c53476b0d3bd864142
NEXT_PUBLIC_HOSPITAL_PROFILE_ADDRESS=0x6040F415CBAd77722F8afF246a16471c10876C2d

# IPFS Configuration (Pinata)
NEXT_PUBLIC_PINATA_GATEWAY=https://gateway.pinata.cloud/ipfs/
PINATA_API_KEY=<your-api-key>
PINATA_API_SECRET=<your-api-secret>
PINATA_JWT=<your-jwt>

# AI Configuration
GOOGLE_API_KEY=<your-google-api-key>

# Relayer Configuration (Server-side only)
RELAYER_PRIVATE_KEY=<admin-private-key>
```

### Lisk Sepolia Testnet Setup

1. Add Lisk Sepolia to MetaMask:
   - Network Name: Lisk Sepolia Testnet
   - RPC URL: https://rpc.sepolia-api.lisk.com
   - Chain ID: 4202
   - Currency Symbol: LSK
   - Block Explorer: https://sepolia-blockscout.lisk.com

2. Get testnet tokens:
   - Visit: https://faucet.sepolia-api.lisk.com
   - Request LSK tokens for your wallet

## Development

### Running Development Server

```bash
npm run dev
```

Server runs on http://localhost:3000

### Building for Production

```bash
npm run build
npm start
```

### Linting

```bash
npm run lint
```

### Smart Contract Development

See [smart-contract/README.md](./smart-contract/README.md) for smart contract development guide.

## Deployment

### Frontend Deployment

The frontend can be deployed to Vercel, Netlify, or any Node.js hosting:

```bash
npm run build
npm start
```

### Smart Contract Deployment

Smart contracts are already deployed on Lisk Sepolia Testnet. To deploy new versions:

```bash
cd smart-contract
forge script script/DeployMedichain.s.sol:DeployMedichain \
  --rpc-url https://rpc.sepolia-api.lisk.com \
  --broadcast \
  --verify
```

See [smart-contract/README.md](./smart-contract/README.md) for detailed deployment instructions.

## Security Considerations

- Patient data is stored locally per device for privacy (not on blockchain)
- Medical records are encrypted before IPFS storage
- Access permissions have automatic expiration
- All transactions require wallet signature
- Soulbound tokens prevent identity transfer
- Role-based access control for sensitive operations
- Reentrancy protection on critical functions

## Troubleshooting

### Common Issues

1. **Wallet not connecting:**
   - Ensure MetaMask is installed
   - Check that Lisk Sepolia is added to MetaMask
   - Try refreshing the page

2. **Transaction fails:**
   - Check wallet has sufficient LSK for gas
   - Verify contract addresses in .env are correct
   - Check network is set to Lisk Sepolia (Chain ID: 4202)

3. **IPFS upload fails:**
   - Verify Pinata credentials in .env
   - Check file size is within limits
   - Ensure internet connection is stable

4. **OCR not working:**
   - Verify Google API key is valid
   - Check image quality and format
   - Ensure image contains readable text

## Contributing

Contributions are welcome. Please follow these guidelines:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## Support

For issues, questions, or suggestions:
- Open an issue on GitHub
- Contact the development team

## Links

- Block Explorer: https://sepolia-blockscout.lisk.com
- Lisk Sepolia Faucet: https://faucet.sepolia-api.lisk.com
- Pinata IPFS: https://www.pinata.cloud
- Google Gemini API: https://ai.google.dev
- Thirdweb: https://thirdweb.com
- Next.js Documentation: https://nextjs.org/docs
