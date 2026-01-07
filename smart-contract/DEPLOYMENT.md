# 🚀 Deployment Guide - Lisk Sepolia Testnet

## Prerequisites

1. **Install Foundry** (jika belum):
   ```bash
   curl -L https://foundry.paradigm.xyz | bash
   foundryup
   ```

2. **Get testnet ETH** dari Lisk Sepolia Faucet:
   - Visit: https://sepolia-faucet.lisk.com/ atau gunakan bridge dari Sepolia ETH

3. **Setup MetaMask** untuk Lisk Sepolia:
   | Setting | Value |
   |---------|-------|
   | Network Name | Lisk Sepolia Testnet |
   | RPC URL | https://rpc.sepolia-api.lisk.com |
   | Chain ID | 4202 |
   | Currency Symbol | ETH |
   | Block Explorer | https://sepolia-blockscout.lisk.com |

---

## Step-by-Step Deployment

### 1. Run Tests First!
```bash
cd back-end/smart-contract
forge test -vv
```

Pastikan semua test pass sebelum deploy.

### 2. Setup Environment Variables

```bash
# Copy example file
cp .env.example .env

# Edit .env dengan private key Anda
nano .env
```

** PENTING: Cara mendapatkan Private Key dari MetaMask:**
1. Buka MetaMask
2. Klik 3 titik di samping akun Anda
3. Pilih "Account Details"
4. Klik "Show Private Key"
5. Masukkan password MetaMask
6. Copy private key (TANPA prefix 0x)

**File `.env` Anda akan terlihat seperti ini:**
```
PRIVATE_KEY=abc123def456...your_private_key_here
RPC_URL=https://rpc.sepolia-api.lisk.com
CHAIN_ID=4202
```

### 3. Load Environment & Deploy

```bash
# Load environment variables
source .env

# Deploy semua contracts
forge script script/DeployMedichain.s.sol:DeployMedichain \
  --rpc-url $RPC_URL \
  --broadcast \
  -vvvv

# Atau deploy satu per satu:
# Deploy hanya PatientIdentity
forge script script/DeployMedichain.s.sol:DeployPatientIdentityOnly \
  --rpc-url $RPC_URL \
  --broadcast

# Deploy hanya HospitalRegistry  
forge script script/DeployMedichain.s.sol:DeployHospitalRegistryOnly \
  --rpc-url $RPC_URL \
  --broadcast
```

### 4. Verify Contract (Optional)

```bash
# Verify di Block Explorer
forge verify-contract \
  --chain-id 4202 \
  --compiler-version v0.8.24 \
  <DEPLOYED_ADDRESS> \
  src/MedichainPatientIdentity.sol:MedichainPatientIdentity \
  --verifier blockscout \
  --verifier-url https://sepolia-blockscout.lisk.com/api/
```

---

## Post-Deployment: Whitelist Hospital

Setelah deploy, Anda perlu whitelist rumah sakit agar bisa menambah pasien dan rekam medis:

```bash
# Set environment variables
export PATIENT_IDENTITY_ADDRESS=0x...your_deployed_address
export HOSPITAL_ADDRESS=0x...hospital_wallet_address
export HOSPITAL_NAME="RS Harapan Sehat"

# Run whitelist script
forge script script/WhitelistHospital.s.sol:WhitelistHospital \
  --rpc-url $RPC_URL \
  --broadcast
```

---

## Update Backend Configuration

Setelah deployment berhasil, update file `.env` di backend server:

```bash
# File: back-end/server/.env
PRIVATE_KEY=your_backend_private_key
RPC_URL=https://rpc.sepolia-api.lisk.com
PATIENT_IDENTITY_ADDRESS=0x...deployed_address
HOSPITAL_REGISTRY_ADDRESS=0x...deployed_address
JWT_SECRET=your_jwt_secret
```

---

## Verify Deployment

Cek contract di Block Explorer:
- https://sepolia-blockscout.lisk.com/address/YOUR_CONTRACT_ADDRESS

---

## Contract Architecture

```
┌─────────────────────────────────┐
│  MedichainPatientIdentity       │
│  ─────────────────────────────  │
│  • Patient SBT (Soulbound NFT)  │
│  • Access Control Management    │
│  • Medical Record Registry      │
│  • Hospital Whitelist           │
└─────────────────────────────────┘
              │
              │ Uses
              ▼
┌─────────────────────────────────┐
│  AutomatedHospitalRegistry      │
│  ─────────────────────────────  │
│  • Hospital Registration        │
│  • Signature Verification       │
│  • Government API Validation    │
└─────────────────────────────────┘
```

---

## Security Notes

1. **JANGAN PERNAH** commit file `.env` ke git
2. Gunakan wallet khusus untuk deployment, bukan wallet utama
3. Pastikan hanya admin yang bisa whitelist hospital
4. Backup private key di tempat aman

---

## Troubleshooting

### Error: Insufficient funds
- Pastikan wallet ada ETH testnet
- Get dari faucet: https://sepolia-faucet.lisk.com/

### Error: Nonce too low
```bash
# Reset nonce dengan flag --resume
forge script script/DeployMedichain.s.sol:DeployMedichain \
  --rpc-url $RPC_URL \
  --broadcast \
  --resume
```

### Error: Gas estimation failed
- Tambahkan flag: `--gas-limit 5000000`
