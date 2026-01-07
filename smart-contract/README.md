
# Medichain - Decentralized Health Record Smart Contracts

> **Deployed on Lisk Sepolia Testnet** ✅  
> **Last Updated:** December 28, 2025

Proyek ini berisi smart contract untuk aplikasi Decentralized Health Record (Medichain) berbasis blockchain. Sistem ini memungkinkan manajemen rekam medis yang aman, terdesentralisasi, dan dapat diakses lintas institusi dengan **kontrol penuh oleh pasien**.

## 🚀 Deployed Contracts

| Contract | Address | Explorer |
|----------|---------|----------|
| **MedichainPatientIdentity** | `0xd694475B5c7D2610dfcBc9F3ea83377A3ac4C5BB` | [View](https://sepolia-blockscout.lisk.com/address/0xd694475B5c7D2610dfcBc9F3ea83377A3ac4C5BB) |
| **AutomatedHospitalRegistry** | `0x7568f9E2D79eB7fE4396BC78fbB63303d984901A` | [View](https://sepolia-blockscout.lisk.com/address/0x7568f9E2D79eB7fE4396BC78fbB63303d984901A) |

**Network:** Lisk Sepolia Testnet (Chain ID: 4202)  
**RPC URL:** https://rpc.sepolia-api.lisk.com

## ✨ Fitur Utama

### 🆔 Soulbound Token (SBT) Identity
- Pasien mendapatkan **NFT identitas yang tidak dapat ditransfer** (Soulbound)
- Hanya rumah sakit yang ter-whitelist yang dapat mencetak identitas pasien
- Satu alamat = satu identitas (mencegah duplikasi)

### 🏥 Hospital Management
- Admin dapat whitelist rumah sakit dengan nama
- Rumah sakit ter-whitelist dapat minting identity & menambah rekam medis
- Registrasi rumah sakit dengan signature pemerintah (AutomatedHospitalRegistry)

### 🔐 Access Control
- Pasien memberikan akses ke rumah sakit dengan durasi tertentu
- Tipe akses: `READ_ONLY` atau `FULL_ACCESS`
- Akses otomatis expired sesuai timestamp
- Pasien dapat mencabut akses kapan saja

### 📋 Medical Records
- Rekam medis disimpan dengan referensi IPFS
- Data hash untuk verifikasi integritas
- ICD-10 code untuk standarisasi diagnosis
- Record type: DIAGNOSIS, LAB_RESULT, dll

## 📁 Struktur Kontrak

```
src/
├── MedichainPatientIdentity.sol    # Kontrak utama (SBT + Access Control + Medical Records)
├── AutomatedHospitalRegistry.sol   # Registrasi RS dengan signature pemerintah
└── PatientRegistry.sol             # Legacy/alternative patient registry
```

### MedichainPatientIdentity.sol
Kontrak utama yang mengelola:
- **Patient Identity** - Soulbound Token (ERC721 non-transferable)
- **Access Control** - Izin akses pasien ke rumah sakit
- **Medical Records** - Penyimpanan hash rekam medis dengan IPFS reference

### AutomatedHospitalRegistry.sol
Kontrak untuk registrasi rumah sakit dengan:
- **Government Signature Verification** - ECDSA signature dari pemerintah
- **Hospital Info Storage** - Nama, lisensi, status registrasi

## 🔧 Alur Penggunaan

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           MEDICHAIN FLOW                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  1. HOSPITAL ONBOARDING                                                      │
│     Admin ──► whitelistHospital(address, "RS Harapan Kita")                 │
│                                                                              │
│  2. PATIENT REGISTRATION                                                     │
│     Hospital ──► mintIdentity(patientAddress)                               │
│     Patient receives Soulbound Token (NFT)                                  │
│                                                                              │
│  3. GRANT ACCESS                                                             │
│     Patient ──► grantAccess(hospitalAddress, "FULL_ACCESS", expiryTime)     │
│                                                                              │
│  4. ADD MEDICAL RECORD                                                       │
│     Hospital ──► addMedicalRecord(patient, ipfsCid, dataHash, icd10, type)  │
│                                                                              │
│  5. SHARE WITH NEW HOSPITAL                                                  │
│     Admin ──► whitelistHospital(newHospitalAddress, "RS Medistra")          │
│     Patient ──► grantAccess(newHospital, "READ_ONLY", expiryTime)           │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 🛠️ Build & Test

### Prerequisites
- [Foundry](https://book.getfoundry.sh/) installed
- Node.js (optional, untuk scripts)

### Build
```bash
forge build
```

### Test
```bash
forge test -vv
```

### Deploy to Lisk Sepolia
```bash
# Copy .env.example to .env and fill your private key
cp .env.example .env

# Deploy
forge script script/DeployMedichain.s.sol:DeployMedichain \
  --rpc-url https://rpc.sepolia-api.lisk.com \
  --broadcast \
  --verify
```

## 📖 Quick Start - Interact with Contracts

### Setup Environment
```bash
source .env
export PATIENT_CONTRACT="0xd694475B5c7D2610dfcBc9F3ea83377A3ac4C5BB"
export RPC_URL="https://rpc.sepolia-api.lisk.com"
```

### 1. Whitelist Hospital (Admin)
```bash
cast send $PATIENT_CONTRACT "whitelistHospital(address,string)" \
  0xHOSPITAL_ADDRESS "RS Harapan Kita" \
  --rpc-url $RPC_URL --private-key $PRIVATE_KEY
```

### 2. Mint Patient Identity (Hospital)
```bash
cast send $PATIENT_CONTRACT "mintIdentity(address)" \
  0xPATIENT_ADDRESS \
  --rpc-url $RPC_URL --private-key $HOSPITAL_PRIVATE_KEY
```

### 3. Grant Access (Patient)
```bash
EXPIRY=$(date -d "+365 days" +%s)
cast send $PATIENT_CONTRACT "grantAccess(address,string,uint256)" \
  0xHOSPITAL_ADDRESS "FULL_ACCESS" $EXPIRY \
  --rpc-url $RPC_URL --private-key $PATIENT_PRIVATE_KEY
```

### 4. Add Medical Record (Hospital)
```bash
DATA_HASH=$(cast keccak "DiagnosisRecord_$(date +%s)")
cast send $PATIENT_CONTRACT "addMedicalRecord(address,string,bytes32,string,string)" \
  0xPATIENT_ADDRESS "QmIPFSHash" $DATA_HASH "A91" "DIAGNOSIS" \
  --rpc-url $RPC_URL --private-key $HOSPITAL_PRIVATE_KEY
```

### 5. Verify Patient Identity
```bash
cast call $PATIENT_CONTRACT "hasPatientIdentity(address)(bool)" \
  0xPATIENT_ADDRESS --rpc-url $RPC_URL
```

## 🎬 Run Complete Demo

Execute the full interaction demo with all scenarios:

```bash
./script/interaction_demo.sh
```

This demonstrates:
- ✅ Hospital whitelist
- ✅ Patient identity minting (SBT)
- ✅ Patient granting access to hospital
- ✅ Hospital adding medical records
- ✅ Patient sharing data with new hospital
- ✅ Final verification

## 📚 Documentation

- **[CONTRACT_INTERACTION.md](./CONTRACT_INTERACTION.md)** - Complete interaction guide with all commands
- **[docs/](./docs/)** - Additional documentation

## ⚠️ Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `HospitalNotWhitelisted` | Hospital not whitelisted | Admin must whitelist hospital first |
| `PatientNotRegistered` | Patient has no identity | Hospital must mint identity for patient |
| `nonce too low` | Transactions sent too fast | Add `sleep 3` between transactions |

## 🔐 Security

- **Soulbound Token**: Patient identities cannot be transferred
- **Access Expiration**: All permissions have expiry timestamps
- **Whitelist Requirement**: Only whitelisted hospitals can interact
- **Role-Based Access**: OpenZeppelin AccessControl
- **Reentrancy Protection**: nonReentrant modifier on critical functions

## 📡 Links

- **Block Explorer:** https://sepolia-blockscout.lisk.com
- **Lisk Sepolia Faucet:** https://faucet.sepolia-api.lisk.com
- **Foundry Docs:** https://book.getfoundry.sh/

---

**Kontribusi & pertanyaan silakan diajukan melalui repository ini.**
