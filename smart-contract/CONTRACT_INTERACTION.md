# Medichain Smart Contract Interaction Guide

> **Last Updated:** December 28, 2025  
> **Tested & Verified:** All commands tested on Lisk Sepolia Testnet ✅

## Deployed Contracts (Lisk Sepolia Testnet)

| Contract | Address | Block Explorer |
|----------|---------|----------------|
| **MedichainPatientIdentity** | `0xd694475B5c7D2610dfcBc9F3ea83377A3ac4C5BB` | [View](https://sepolia-blockscout.lisk.com/address/0xd694475B5c7D2610dfcBc9F3ea83377A3ac4C5BB) |
| **AutomatedHospitalRegistry** | `0x7568f9E2D79eB7fE4396BC78fbB63303d984901A` | [View](https://sepolia-blockscout.lisk.com/address/0x7568f9E2D79eB7fE4396BC78fbB63303d984901A) |

**Network Details:**
- **Chain ID:** 4202
- **RPC URL:** https://rpc.sepolia-api.lisk.com
- **Block Explorer:** https://sepolia-blockscout.lisk.com

**Test Accounts Used:**
| Role | Address |
|------|---------|
| Admin/Hospital (RS Harapan Kita) | `0x8b9616c56fc48cf040F7204CFD6D67ef34f6CF21` |
| Patient 1 (Budi) | `0xA06c806a1616577f4ABc2368e6e9dAA9611eDE3B` |
| Patient 2 (Eka) | `0x89fE14d303EF4C16b6611FdC0561B9A274fd8151` |
| RS Medistra | `0x09f484232739F451ac5BD79d77c8D2889e412030` |

---

## Quick Start - Environment Setup

```bash
# Load environment variables
source .env

# Set contract addresses
export RPC_URL="https://rpc.sepolia-api.lisk.com"
export PATIENT_CONTRACT="0xd694475B5c7D2610dfcBc9F3ea83377A3ac4C5BB"
export HOSPITAL_REGISTRY="0x7568f9E2D79eB7fE4396BC78fbB63303d984901A"

# Get your wallet address from private key
ADMIN_ADDRESS=$(cast wallet address --private-key $PRIVATE_KEY)
echo "Admin Address: $ADMIN_ADDRESS"
```

---

## MedichainPatientIdentity Contract

### Overview
This contract manages:
- Patient identity as **Soulbound Token (SBT)** - non-transferable NFT
- Access control between patients and hospitals
- Medical records storage (IPFS references + data hashes)

### Roles
| Role | Description |
|------|-------------|
| `DEFAULT_ADMIN_ROLE` | Contract owner, full access |
| `ADMIN_ROLE` | Can whitelist hospitals |
| `HOSPITAL_ROLE` | Whitelisted hospitals that can mint identities and add records |

### Access Types (String-based)
```
"READ_ONLY"     - View medical records only
"FULL_ACCESS"   - View + add medical records
```

---

## 🏥 Hospital Flow

### 1. Whitelist Hospital (Admin Only)

Hospitals must be whitelisted before they can mint patient identities or add records.

```solidity
function whitelistHospital(address hospital, string memory hospitalName) external
```

**Cast Command (TESTED ✅):**
```bash
cast send $PATIENT_CONTRACT \
  "whitelistHospital(address,string)" \
  "0xHOSPITAL_ADDRESS" \
  "RS Harapan Kita" \
  --rpc-url $RPC_URL \
  --private-key $PRIVATE_KEY
```

**Example (Tested):**
```bash
cast send 0xd694475B5c7D2610dfcBc9F3ea83377A3ac4C5BB \
  "whitelistHospital(address,string)" \
  0x8b9616c56fc48cf040F7204CFD6D67ef34f6CF21 \
  "RS Harapan Kita" \
  --rpc-url https://rpc.sepolia-api.lisk.com \
  --private-key $PRIVATE_KEY
```

### 2. Check Hospital Authorization

```solidity
function isHospitalAuthorized(address hospital) external view returns (bool)
```

**Cast Command (TESTED ✅):**
```bash
cast call $PATIENT_CONTRACT \
  "isHospitalAuthorized(address)(bool)" \
  "0xHOSPITAL_ADDRESS" \
  --rpc-url $RPC_URL
```

**Example:**
```bash
cast call 0xd694475B5c7D2610dfcBc9F3ea83377A3ac4C5BB \
  "isHospitalAuthorized(address)(bool)" \
  0x8b9616c56fc48cf040F7204CFD6D67ef34f6CF21 \
  --rpc-url https://rpc.sepolia-api.lisk.com
# Output: true
```

### 3. Mint Patient Identity (Hospital Mints for Patient)

Hospital mints a Soulbound Token for the patient. Patient cannot mint their own identity.

```solidity
function mintIdentity(address patient) external returns (uint256 tokenId)
```

**Cast Command (TESTED ✅):**
```bash
cast send $PATIENT_CONTRACT \
  "mintIdentity(address)" \
  "0xPATIENT_ADDRESS" \
  --rpc-url $RPC_URL \
  --private-key $HOSPITAL_PRIVATE_KEY
```

**Example (Tested):**
```bash
cast send 0xd694475B5c7D2610dfcBc9F3ea83377A3ac4C5BB \
  "mintIdentity(address)" \
  0x89fE14d303EF4C16b6611FdC0561B9A274fd8151 \
  --rpc-url https://rpc.sepolia-api.lisk.com \
  --private-key $PRIVATE_KEY
```

---

## 👤 Patient Flow

### 1. Check Patient Has Identity

```solidity
function hasPatientIdentity(address patient) external view returns (bool)
```

**Cast Command (TESTED ✅):**
```bash
cast call $PATIENT_CONTRACT \
  "hasPatientIdentity(address)(bool)" \
  "0xPATIENT_ADDRESS" \
  --rpc-url $RPC_URL
```

### 2. Get Patient Token ID

```solidity
function getPatientId(address patient) external view returns (uint256)
```

**Cast Command (TESTED ✅):**
```bash
cast call $PATIENT_CONTRACT \
  "getPatientId(address)(uint256)" \
  "0xPATIENT_ADDRESS" \
  --rpc-url $RPC_URL
```

### 3. Grant Access to Hospital (Patient Action)

Patient grants access to a whitelisted hospital for a specific duration.

**⚠️ IMPORTANT: Hospital must be whitelisted first, otherwise error `HospitalNotWhitelisted`**

```solidity
function grantAccess(
    address accessor,          // Hospital address (must be whitelisted)
    string memory accessType,  // "READ_ONLY" or "FULL_ACCESS"
    uint256 expiresAt          // Unix timestamp when access expires
) external
```

**Cast Command (TESTED ✅):**
```bash
# Calculate expiry (365 days from now)
EXPIRY=$(date -d "+365 days" +%s)

cast send $PATIENT_CONTRACT \
  "grantAccess(address,string,uint256)" \
  "0xHOSPITAL_ADDRESS" \
  "FULL_ACCESS" \
  $EXPIRY \
  --rpc-url $RPC_URL \
  --private-key $PATIENT_PRIVATE_KEY
```

**Example (Tested):**
```bash
# Grant FULL_ACCESS to RS Harapan Kita for 365 days
EXPIRY=$(date -d "+365 days" +%s)
cast send 0xd694475B5c7D2610dfcBc9F3ea83377A3ac4C5BB \
  "grantAccess(address,string,uint256)" \
  0x8b9616c56fc48cf040F7204CFD6D67ef34f6CF21 \
  "FULL_ACCESS" \
  $EXPIRY \
  --rpc-url https://rpc.sepolia-api.lisk.com \
  --private-key $PATIENT_PRIVATE_KEY
```

```bash
# Grant READ_ONLY to RS Medistra for 30 days
EXPIRY=$(date -d "+30 days" +%s)
cast send 0xd694475B5c7D2610dfcBc9F3ea83377A3ac4C5BB \
  "grantAccess(address,string,uint256)" \
  0x09f484232739F451ac5BD79d77c8D2889e412030 \
  "READ_ONLY" \
  $EXPIRY \
  --rpc-url https://rpc.sepolia-api.lisk.com \
  --private-key $PATIENT_PRIVATE_KEY
```

---

## 📋 Medical Records Flow

### 1. Add Medical Record (Hospital Only)

Hospital adds medical record for patient (requires having access from patient).

```solidity
function addMedicalRecord(
    address patient,           // Patient address
    string memory ipfsCid,     // IPFS Content ID of encrypted medical data
    bytes32 dataHash,          // SHA-256 hash of the data for integrity verification
    string memory icd10Code,   // ICD-10 diagnosis code (e.g., "A91", "D69.6")
    string memory recordType   // Type of record (e.g., "DIAGNOSIS", "LAB_RESULT")
) external returns (uint256 recordId)
```

**Cast Command (TESTED ✅):**
```bash
# Create data hash
DATA_HASH=$(cast keccak "UniqueDataIdentifier_$(date +%s)")

cast send $PATIENT_CONTRACT \
  "addMedicalRecord(address,string,bytes32,string,string)" \
  "0xPATIENT_ADDRESS" \
  "QmIPFSContentID" \
  $DATA_HASH \
  "ICD10_CODE" \
  "RECORD_TYPE" \
  --rpc-url $RPC_URL \
  --private-key $HOSPITAL_PRIVATE_KEY
```

**Example (Tested) - Diagnosis Record:**
```bash
DATA_HASH=$(cast keccak "DemamBerdarah_Eka_$(date +%s)")
cast send 0xd694475B5c7D2610dfcBc9F3ea83377A3ac4C5BB \
  "addMedicalRecord(address,string,bytes32,string,string)" \
  0x89fE14d303EF4C16b6611FdC0561B9A274fd8151 \
  "QmDemamBerdarahRecord_Eka_001" \
  $DATA_HASH \
  "A91" \
  "DIAGNOSIS" \
  --rpc-url https://rpc.sepolia-api.lisk.com \
  --private-key $PRIVATE_KEY
```

**Example (Tested) - Lab Result:**
```bash
DATA_HASH=$(cast keccak "LabResult_Eka_$(date +%s)")
cast send 0xd694475B5c7D2610dfcBc9F3ea83377A3ac4C5BB \
  "addMedicalRecord(address,string,bytes32,string,string)" \
  0x89fE14d303EF4C16b6611FdC0561B9A274fd8151 \
  "QmLabResult_Eka_Trombosit_001" \
  $DATA_HASH \
  "D69.6" \
  "LAB_RESULT" \
  --rpc-url https://rpc.sepolia-api.lisk.com \
  --private-key $PRIVATE_KEY
```

---

## AutomatedHospitalRegistry Contract

### Overview
This contract manages hospital registration with government signature verification using ECDSA.

### Roles
| Role | Description |
|------|-------------|
| `DEFAULT_ADMIN_ROLE` | Contract owner, can manage all roles |
| `GOVERNMENT_SIGNER` | Address that signs hospital registration approvals |

### Functions

#### 1. Register Hospital (with Government Signature)
```solidity
function registerHospital(
    string calldata name,
    string calldata licenseNumber,
    bytes calldata signature
) external
```

**Cast Command:**
```bash
cast send $HOSPITAL_REGISTRY \
  "registerHospital(string,string,bytes)" \
  "RS Central" \
  "LIC-2024-001" \
  "0x<signature_hex>" \
  --rpc-url $RPC_URL \
  --private-key $HOSPITAL_PRIVATE_KEY
```

#### 2. Check if Hospital is Registered
```solidity
function isHospitalRegistered(address hospital) external view returns (bool)
```

**Cast Command:**
```bash
cast call $HOSPITAL_REGISTRY \
  "isHospitalRegistered(address)(bool)" \
  "0xHOSPITAL_ADDRESS" \
  --rpc-url $RPC_URL
```

#### 3. Get Hospital Info
```solidity
function getHospital(address hospital) external view returns (
    string memory name,
    string memory licenseNumber,
    bool isRegistered,
    uint256 registeredAt
)
```

**Cast Command:**
```bash
cast call $HOSPITAL_REGISTRY \
  "getHospital(address)" \
  "0xHOSPITAL_ADDRESS" \
  --rpc-url $RPC_URL
```

---

## Complete Tested Scenarios

### Scenario 1: Hospital Onboarding
```bash
source .env
export PATIENT_CONTRACT="0xd694475B5c7D2610dfcBc9F3ea83377A3ac4C5BB"
export RPC_URL="https://rpc.sepolia-api.lisk.com"

# 1. Admin whitelist hospital
cast send $PATIENT_CONTRACT "whitelistHospital(address,string)" \
  $HOSPITAL_ADDRESS "RS Harapan Kita" \
  --rpc-url $RPC_URL --private-key $PRIVATE_KEY

# 2. Verify hospital is authorized
cast call $PATIENT_CONTRACT "isHospitalAuthorized(address)(bool)" \
  $HOSPITAL_ADDRESS --rpc-url $RPC_URL
# Output: true
```

### Scenario 2: New Patient Registration
```bash
# 1. Hospital mints identity for patient
cast send $PATIENT_CONTRACT "mintIdentity(address)" \
  $PATIENT_ADDRESS \
  --rpc-url $RPC_URL --private-key $HOSPITAL_PRIVATE_KEY

# 2. Verify patient has identity
cast call $PATIENT_CONTRACT "hasPatientIdentity(address)(bool)" \
  $PATIENT_ADDRESS --rpc-url $RPC_URL
# Output: true

# 3. Get patient token ID
cast call $PATIENT_CONTRACT "getPatientId(address)(uint256)" \
  $PATIENT_ADDRESS --rpc-url $RPC_URL
# Output: 4
```

### Scenario 3: Grant Access & Add Records
```bash
# 1. Patient grants FULL_ACCESS to hospital (365 days)
EXPIRY=$(date -d "+365 days" +%s)
cast send $PATIENT_CONTRACT "grantAccess(address,string,uint256)" \
  $HOSPITAL_ADDRESS "FULL_ACCESS" $EXPIRY \
  --rpc-url $RPC_URL --private-key $PATIENT_PRIVATE_KEY

# Wait for blockchain to process
sleep 3

# 2. Hospital adds medical record
DATA_HASH=$(cast keccak "DiagnosisRecord_$(date +%s)")
cast send $PATIENT_CONTRACT "addMedicalRecord(address,string,bytes32,string,string)" \
  $PATIENT_ADDRESS "QmIPFSHash001" $DATA_HASH "A91" "DIAGNOSIS" \
  --rpc-url $RPC_URL --private-key $HOSPITAL_PRIVATE_KEY
```

### Scenario 4: Data Sharing with New Hospital
```bash
# ⚠️ IMPORTANT: Admin must whitelist the new hospital FIRST!

# 1. Admin whitelist new hospital
cast send $PATIENT_CONTRACT "whitelistHospital(address,string)" \
  $NEW_HOSPITAL_ADDRESS "RS Medistra" \
  --rpc-url $RPC_URL --private-key $ADMIN_PRIVATE_KEY

sleep 3

# 2. Patient grants READ_ONLY access (30 days)
EXPIRY=$(date -d "+30 days" +%s)
cast send $PATIENT_CONTRACT "grantAccess(address,string,uint256)" \
  $NEW_HOSPITAL_ADDRESS "READ_ONLY" $EXPIRY \
  --rpc-url $RPC_URL --private-key $PATIENT_PRIVATE_KEY
```

---

## Common Errors & Solutions

### Error: `HospitalNotWhitelisted`
```
Error: Failed to estimate gas: execution reverted, data: "0x409622d3"
```
**Cause:** Trying to grant access to a hospital that is not whitelisted.  
**Solution:** Admin must whitelist the hospital first:
```bash
cast send $PATIENT_CONTRACT "whitelistHospital(address,string)" \
  $HOSPITAL_ADDRESS "Hospital Name" \
  --rpc-url $RPC_URL --private-key $ADMIN_PRIVATE_KEY
```

### Error: `PatientNotRegistered`
**Cause:** Patient doesn't have an identity token.  
**Solution:** Hospital must mint identity for patient:
```bash
cast send $PATIENT_CONTRACT "mintIdentity(address)" \
  $PATIENT_ADDRESS \
  --rpc-url $RPC_URL --private-key $HOSPITAL_PRIVATE_KEY
```

### Error: `nonce too low`
**Cause:** Transactions sent too quickly, blockchain hasn't updated nonce.  
**Solution:** Add delay between transactions:
```bash
cast send ... --rpc-url $RPC_URL --private-key $KEY
sleep 3  # Wait 3 seconds before next transaction
cast send ...
```

### Error: `execution reverted` (generic)
**Cause:** Function called with wrong parameters or wrong signature.  
**Solution:** Verify function signature matches exactly. Common mistakes:
- ❌ `grantAccess(address,uint8,uint256)` 
- ✅ `grantAccess(address,string,uint256)` - uses STRING for accessType!
- ❌ `whitelistHospital(address)` 
- ✅ `whitelistHospital(address,string)` - requires hospital name!
- ❌ `addMedicalRecord(address,string,string,string)` 
- ✅ `addMedicalRecord(address,string,bytes32,string,string)` - 5 params!

---

## JavaScript/Ethers.js Integration

### Setup
```javascript
const { ethers } = require('ethers');

const provider = new ethers.JsonRpcProvider('https://rpc.sepolia-api.lisk.com');
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

const PATIENT_CONTRACT = '0xd694475B5c7D2610dfcBc9F3ea83377A3ac4C5BB';
const HOSPITAL_REGISTRY = '0x7568f9E2D79eB7fE4396BC78fbB63303d984901A';

// Load ABIs from compiled artifacts
const patientABI = require('./out/MedichainPatientIdentity.sol/MedichainPatientIdentity.json').abi;
const patientContract = new ethers.Contract(PATIENT_CONTRACT, patientABI, wallet);
```

### Whitelist Hospital
```javascript
async function whitelistHospital(hospitalAddress, hospitalName) {
    const tx = await patientContract.whitelistHospital(hospitalAddress, hospitalName);
    await tx.wait();
    console.log('Hospital whitelisted:', hospitalName);
}
```

### Mint Identity
```javascript
async function mintIdentity(patientAddress) {
    const tx = await patientContract.mintIdentity(patientAddress);
    const receipt = await tx.wait();
    console.log('Identity minted, Tx:', receipt.hash);
}
```

### Grant Access
```javascript
async function grantAccess(hospitalAddress, accessType, days) {
    const expiresAt = Math.floor(Date.now() / 1000) + (days * 24 * 60 * 60);
    const tx = await patientContract.grantAccess(hospitalAddress, accessType, expiresAt);
    await tx.wait();
    console.log('Access granted');
}

// Usage
await grantAccess('0x...', 'FULL_ACCESS', 365);
await grantAccess('0x...', 'READ_ONLY', 30);
```

### Add Medical Record
```javascript
async function addMedicalRecord(patientAddress, ipfsCid, icd10Code, recordType) {
    const dataHash = ethers.keccak256(ethers.toUtf8Bytes(`${recordType}_${Date.now()}`));
    const tx = await patientContract.addMedicalRecord(
        patientAddress,
        ipfsCid,
        dataHash,
        icd10Code,
        recordType
    );
    await tx.wait();
    console.log('Record added');
}

// Usage
await addMedicalRecord('0x...', 'QmIPFS123', 'A91', 'DIAGNOSIS');
await addMedicalRecord('0x...', 'QmIPFS456', 'D69.6', 'LAB_RESULT');
```

---

## Events

### MedichainPatientIdentity Events
```solidity
event IdentityMinted(address indexed patient, uint256 indexed tokenId, uint256 timestamp);
event AccessGranted(address indexed patient, address indexed accessor, string accessType, uint256 expiresAt);
event AccessRevoked(address indexed patient, address indexed accessor);
event MedicalRecordAdded(address indexed patient, address indexed hospital, string ipfsCid, string icd10Code);
event HospitalWhitelisted(address indexed hospital, string name);
```

### AutomatedHospitalRegistry Events
```solidity
event HospitalRegistered(address indexed hospital, string name, string licenseNumber);
event GovernmentSignerUpdated(address indexed oldSigner, address indexed newSigner);
```

### Listen to Events (JavaScript)
```javascript
// Listen for new identity mints
patientContract.on('IdentityMinted', (patient, tokenId, timestamp) => {
    console.log(`New patient registered: ${patient}, Token: ${tokenId}`);
});

// Listen for access grants
patientContract.on('AccessGranted', (patient, accessor, accessType, expiresAt) => {
    console.log(`${accessor} granted ${accessType} access to ${patient}'s records`);
});

// Listen for new medical records
patientContract.on('MedicalRecordAdded', (patient, hospital, ipfsCid, icd10Code) => {
    console.log(`New record for ${patient}: ${icd10Code} by ${hospital}`);
});
```

---

## Security Considerations

1. **Soulbound Token (SBT)**: Patient tokens cannot be transferred - bound to patient address
2. **Hospital-Minted Identity**: Only whitelisted hospitals can mint patient identities
3. **Access Expiration**: All access permissions have expiry timestamps
4. **Whitelist Requirement**: Hospitals must be whitelisted before patients can grant them access
5. **Reentrancy Protection**: Critical functions are protected with `nonReentrant` modifier
6. **Role-Based Access**: OpenZeppelin AccessControl for admin functions

---

## Support & Links

- **Block Explorer:** https://sepolia-blockscout.lisk.com
- **Lisk Sepolia Faucet:** https://faucet.sepolia-api.lisk.com
- **Patient Contract:** https://sepolia-blockscout.lisk.com/address/0xd694475B5c7D2610dfcBc9F3ea83377A3ac4C5BB
- **Hospital Registry:** https://sepolia-blockscout.lisk.com/address/0x7568f9E2D79eB7fE4396BC78fbB63303d984901A

---

## Full Demo Script

Run the complete interaction demo:
```bash
cd /workspaces/health-record-dapps/back-end/smart-contract
./script/interaction_demo.sh
```

This script demonstrates:
1. ✅ Hospital whitelist
2. ✅ Patient identity minting (SBT)
3. ✅ Patient granting access to hospital
4. ✅ Hospital adding medical records
5. ✅ Patient sharing data with new hospital
6. ✅ Final verification

---

## Environment Variables Reference

```bash
# .env file
PRIVATE_KEY=0x...       # Admin/Hospital wallet
PRIVATE_KEY2=0x...      # Patient 1 (Budi)
PRIVATE_KEY3=0x...      # RS Medistra
PRIVATE_KEY4=0x...      # Patient 3
PRIVATE_KEY5=0x...      # Patient 4 (Eka)
RPC_URL=https://rpc.sepolia-api.lisk.com
CHAIN_ID=4202

# Contract addresses
PATIENT_CONTRACT=0xd694475B5c7D2610dfcBc9F3ea83377A3ac4C5BB
HOSPITAL_REGISTRY=0x7568f9E2D79eB7fE4396BC78fbB63303d984901A
```
