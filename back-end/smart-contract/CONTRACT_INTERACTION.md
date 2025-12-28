# Medichain Smart Contract Interaction Guide

## Deployed Contracts (Lisk Sepolia Testnet)

| Contract | Address | Block Explorer |
|----------|---------|----------------|
| **AutomatedHospitalRegistry** | `0xd694475B5c7D2610dfcBc9F3ea83377A3ac4C5BB` | [View](https://sepolia-blockscout.lisk.com/address/0xd694475B5c7D2610dfcBc9F3ea83377A3ac4C5BB) |
| **MedichainPatientIdentity** | `0x7568f9E2D79eB7fE4396BC78fbB63303d984901A` | [View](https://sepolia-blockscout.lisk.com/address/0x7568f9E2D79eB7fE4396BC78fbB63303d984901A) |

**Network Details:**
- **Chain ID:** 4202
- **RPC URL:** https://rpc.sepolia-api.lisk.com
- **Block Explorer:** https://sepolia-blockscout.lisk.com

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
    string calldata _name,
    string calldata _licenseNumber,
    bytes calldata _signature
) external
```

**Cast Command:**
```bash
# First, generate signature from government signer
# The message to sign is: keccak256(abi.encodePacked(hospitalAddress, licenseNumber))

cast send 0xd694475B5c7D2610dfcBc9F3ea83377A3ac4C5BB \
  "registerHospital(string,string,bytes)" \
  "RS Harapan Kita" \
  "LIC-2024-001" \
  "0x<signature_hex>" \
  --rpc-url https://rpc.sepolia-api.lisk.com \
  --private-key $PRIVATE_KEY
```

#### 2. Check if Hospital is Registered
```solidity
function isHospitalRegistered(address _hospital) external view returns (bool)
```

**Cast Command:**
```bash
cast call 0xd694475B5c7D2610dfcBc9F3ea83377A3ac4C5BB \
  "isHospitalRegistered(address)" \
  "0xHOSPITAL_ADDRESS" \
  --rpc-url https://rpc.sepolia-api.lisk.com
```

#### 3. Get Hospital Info
```solidity
function getHospital(address _hospital) external view returns (
    string memory name,
    string memory licenseNumber,
    bool isRegistered,
    uint256 registeredAt
)
```

**Cast Command:**
```bash
cast call 0xd694475B5c7D2610dfcBc9F3ea83377A3ac4C5BB \
  "getHospital(address)" \
  "0xHOSPITAL_ADDRESS" \
  --rpc-url https://rpc.sepolia-api.lisk.com
```

#### 4. Set Government Signer (Admin Only)
```solidity
function setGovernmentSigner(address _signer) external onlyRole(DEFAULT_ADMIN_ROLE)
```

**Cast Command:**
```bash
cast send 0xd694475B5c7D2610dfcBc9F3ea83377A3ac4C5BB \
  "setGovernmentSigner(address)" \
  "0xNEW_SIGNER_ADDRESS" \
  --rpc-url https://rpc.sepolia-api.lisk.com \
  --private-key $ADMIN_PRIVATE_KEY
```

---

## MedichainPatientIdentity Contract

### Overview
This contract manages patient identity (Soulbound Token), access control, and medical records.

### Roles
| Role | Description |
|------|-------------|
| `DEFAULT_ADMIN_ROLE` | Contract owner, full access |
| `ADMIN_ROLE` | Can manage hospitals and system settings |
| `HOSPITAL_ROLE` | Registered hospitals that can add medical records |

### Access Types (Enum)
```solidity
enum AccessType {
    NONE,           // 0 - No access
    VIEW_BASIC,     // 1 - View basic profile only
    VIEW_RECORDS,   // 2 - View medical records
    ADD_RECORDS,    // 3 - Add new medical records
    FULL_ACCESS     // 4 - Full access (view + add)
}
```

---

## Patient Flow

### 1. Register Patient (Get Soulbound Token)
```solidity
function registerPatient(
    string calldata _name,
    string calldata _dateOfBirth,
    string calldata _gender,
    string calldata _bloodType,
    string calldata _encryptedDataHash
) external returns (uint256 tokenId)
```

**Cast Command:**
```bash
cast send 0x7568f9E2D79eB7fE4396BC78fbB63303d984901A \
  "registerPatient(string,string,string,string,string)" \
  "John Doe" \
  "1990-01-15" \
  "Male" \
  "O+" \
  "QmXyz...encrypted_data_hash" \
  --rpc-url https://rpc.sepolia-api.lisk.com \
  --private-key $PATIENT_PRIVATE_KEY
```

### 2. Get Patient Profile
```solidity
function getPatientProfile(address _patient) external view returns (
    string memory name,
    string memory dateOfBirth,
    string memory gender,
    string memory bloodType,
    uint256 tokenId,
    uint256 registeredAt,
    bool isActive
)
```

**Cast Command:**
```bash
cast call 0x7568f9E2D79eB7fE4396BC78fbB63303d984901A \
  "getPatientProfile(address)" \
  "0xPATIENT_ADDRESS" \
  --rpc-url https://rpc.sepolia-api.lisk.com
```

### 3. Update Patient Profile
```solidity
function updatePatientProfile(
    string calldata _name,
    string calldata _bloodType,
    string calldata _encryptedDataHash
) external onlyRegisteredPatient
```

**Cast Command:**
```bash
cast send 0x7568f9E2D79eB7fE4396BC78fbB63303d984901A \
  "updatePatientProfile(string,string,string)" \
  "John Doe Updated" \
  "AB+" \
  "QmNewHash..." \
  --rpc-url https://rpc.sepolia-api.lisk.com \
  --private-key $PATIENT_PRIVATE_KEY
```

---

## Access Control Flow

### 1. Grant Access to Hospital/Doctor
```solidity
function grantAccess(
    address _accessor,
    AccessType _accessType,
    uint256 _expiresAt
) external onlyRegisteredPatient
```

**Cast Command:**
```bash
# Grant VIEW_RECORDS access for 30 days
cast send 0x7568f9E2D79eB7fE4396BC78fbB63303d984901A \
  "grantAccess(address,uint8,uint256)" \
  "0xHOSPITAL_ADDRESS" \
  2 \
  $(date -d "+30 days" +%s) \
  --rpc-url https://rpc.sepolia-api.lisk.com \
  --private-key $PATIENT_PRIVATE_KEY
```

### 2. Grant Access with Signature (Gasless for Patient)
```solidity
function grantAccessWithSignature(
    address _patient,
    address _accessor,
    AccessType _accessType,
    uint256 _expiresAt,
    uint256 _nonce,
    bytes calldata _signature
) external
```

**JavaScript Example:**
```javascript
const ethers = require('ethers');

async function grantAccessWithSignature() {
    const patient = new ethers.Wallet(PATIENT_PRIVATE_KEY);
    const accessor = "0xHOSPITAL_ADDRESS";
    const accessType = 2; // VIEW_RECORDS
    const expiresAt = Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60); // 30 days
    const nonce = await contract.getPatientNonce(patient.address);
    
    // Create message hash
    const messageHash = ethers.solidityPackedKeccak256(
        ["address", "address", "uint8", "uint256", "uint256"],
        [patient.address, accessor, accessType, expiresAt, nonce]
    );
    
    // Sign the message
    const signature = await patient.signMessage(ethers.getBytes(messageHash));
    
    // Anyone can submit this transaction
    await contract.grantAccessWithSignature(
        patient.address,
        accessor,
        accessType,
        expiresAt,
        nonce,
        signature
    );
}
```

### 3. Check Access Permission
```solidity
function hasAccess(
    address _patient,
    address _accessor,
    AccessType _requiredAccess
) external view returns (bool)
```

**Cast Command:**
```bash
cast call 0x7568f9E2D79eB7fE4396BC78fbB63303d984901A \
  "hasAccess(address,address,uint8)" \
  "0xPATIENT_ADDRESS" \
  "0xHOSPITAL_ADDRESS" \
  2 \
  --rpc-url https://rpc.sepolia-api.lisk.com
```

### 4. Get Access Details
```solidity
function getAccessPermission(
    address _patient,
    address _accessor
) external view returns (
    AccessType accessType,
    uint256 grantedAt,
    uint256 expiresAt,
    bool isActive
)
```

**Cast Command:**
```bash
cast call 0x7568f9E2D79eB7fE4396BC78fbB63303d984901A \
  "getAccessPermission(address,address)" \
  "0xPATIENT_ADDRESS" \
  "0xHOSPITAL_ADDRESS" \
  --rpc-url https://rpc.sepolia-api.lisk.com
```

### 5. Revoke Access
```solidity
function revokeAccess(address _accessor) external onlyRegisteredPatient
```

**Cast Command:**
```bash
cast send 0x7568f9E2D79eB7fE4396BC78fbB63303d984901A \
  "revokeAccess(address)" \
  "0xHOSPITAL_ADDRESS" \
  --rpc-url https://rpc.sepolia-api.lisk.com \
  --private-key $PATIENT_PRIVATE_KEY
```

### 6. Get All Accessors for Patient
```solidity
function getPatientAccessors(address _patient) external view returns (address[] memory)
```

**Cast Command:**
```bash
cast call 0x7568f9E2D79eB7fE4396BC78fbB63303d984901A \
  "getPatientAccessors(address)" \
  "0xPATIENT_ADDRESS" \
  --rpc-url https://rpc.sepolia-api.lisk.com
```

---

## Medical Records Flow

### 1. Add Medical Record (Hospital Only)
```solidity
function addMedicalRecord(
    address _patient,
    string calldata _recordType,
    string calldata _ipfsHash,
    string calldata _encryptedKey
) external returns (uint256 recordId)
```

**Cast Command:**
```bash
cast send 0x7568f9E2D79eB7fE4396BC78fbB63303d984901A \
  "addMedicalRecord(address,string,string,string)" \
  "0xPATIENT_ADDRESS" \
  "Lab Result" \
  "QmXyz...ipfs_hash" \
  "encrypted_key_base64" \
  --rpc-url https://rpc.sepolia-api.lisk.com \
  --private-key $HOSPITAL_PRIVATE_KEY
```

### 2. Get Medical Record
```solidity
function getMedicalRecord(
    address _patient,
    uint256 _recordId
) external view returns (
    uint256 id,
    string memory recordType,
    address hospital,
    uint256 timestamp,
    string memory ipfsHash,
    bool isActive
)
```

**Cast Command:**
```bash
cast call 0x7568f9E2D79eB7fE4396BC78fbB63303d984901A \
  "getMedicalRecord(address,uint256)" \
  "0xPATIENT_ADDRESS" \
  1 \
  --rpc-url https://rpc.sepolia-api.lisk.com
```

### 3. Get Patient Record Count
```solidity
function getPatientRecordCount(address _patient) external view returns (uint256)
```

**Cast Command:**
```bash
cast call 0x7568f9E2D79eB7fE4396BC78fbB63303d984901A \
  "getPatientRecordCount(address)" \
  "0xPATIENT_ADDRESS" \
  --rpc-url https://rpc.sepolia-api.lisk.com
```

### 4. Get Encrypted Key (Requires Access)
```solidity
function getRecordEncryptedKey(
    address _patient,
    uint256 _recordId
) external view returns (string memory)
```

**Cast Command:**
```bash
cast call 0x7568f9E2D79eB7fE4396BC78fbB63303d984901A \
  "getRecordEncryptedKey(address,uint256)" \
  "0xPATIENT_ADDRESS" \
  1 \
  --rpc-url https://rpc.sepolia-api.lisk.com \
  --from 0xAUTHORIZED_ADDRESS
```

### 5. Deactivate Record (Patient Only)
```solidity
function deactivateRecord(uint256 _recordId) external onlyRegisteredPatient
```

**Cast Command:**
```bash
cast send 0x7568f9E2D79eB7fE4396BC78fbB63303d984901A \
  "deactivateRecord(uint256)" \
  1 \
  --rpc-url https://rpc.sepolia-api.lisk.com \
  --private-key $PATIENT_PRIVATE_KEY
```

---

## Hospital Management (Admin Only)

### 1. Whitelist Hospital in Patient Contract
```solidity
function whitelistHospital(address _hospital) external onlyRole(ADMIN_ROLE)
```

**Cast Command:**
```bash
cast send 0x7568f9E2D79eB7fE4396BC78fbB63303d984901A \
  "whitelistHospital(address)" \
  "0xHOSPITAL_ADDRESS" \
  --rpc-url https://rpc.sepolia-api.lisk.com \
  --private-key $ADMIN_PRIVATE_KEY
```

### 2. Remove Hospital from Whitelist
```solidity
function removeHospitalFromWhitelist(address _hospital) external onlyRole(ADMIN_ROLE)
```

**Cast Command:**
```bash
cast send 0x7568f9E2D79eB7fE4396BC78fbB63303d984901A \
  "removeHospitalFromWhitelist(address)" \
  "0xHOSPITAL_ADDRESS" \
  --rpc-url https://rpc.sepolia-api.lisk.com \
  --private-key $ADMIN_PRIVATE_KEY
```

### 3. Check Hospital Authorization
```solidity
function isHospitalAuthorized(address _hospital) external view returns (bool)
```

**Cast Command:**
```bash
cast call 0x7568f9E2D79eB7fE4396BC78fbB63303d984901A \
  "isHospitalAuthorized(address)" \
  "0xHOSPITAL_ADDRESS" \
  --rpc-url https://rpc.sepolia-api.lisk.com
```

---

## Complete Flow Examples

### Flow 1: Patient Registration & Profile Setup

```bash
# 1. Patient registers and gets SBT
cast send 0x7568f9E2D79eB7fE4396BC78fbB63303d984901A \
  "registerPatient(string,string,string,string,string)" \
  "Alice Smith" "1995-05-20" "Female" "A+" "QmEncryptedHash123" \
  --rpc-url https://rpc.sepolia-api.lisk.com \
  --private-key $PATIENT_PRIVATE_KEY

# 2. Check patient profile
cast call 0x7568f9E2D79eB7fE4396BC78fbB63303d984901A \
  "getPatientProfile(address)" $PATIENT_ADDRESS \
  --rpc-url https://rpc.sepolia-api.lisk.com

# 3. Get patient's token ID
cast call 0x7568f9E2D79eB7fE4396BC78fbB63303d984901A \
  "getPatientTokenId(address)" $PATIENT_ADDRESS \
  --rpc-url https://rpc.sepolia-api.lisk.com
```

### Flow 2: Hospital Registration & Verification

```bash
# 1. Admin sets government signer
cast send 0xd694475B5c7D2610dfcBc9F3ea83377A3ac4C5BB \
  "setGovernmentSigner(address)" $GOV_SIGNER_ADDRESS \
  --rpc-url https://rpc.sepolia-api.lisk.com \
  --private-key $ADMIN_PRIVATE_KEY

# 2. Generate signature (off-chain by government)
# Message: keccak256(hospitalAddress + licenseNumber)

# 3. Hospital registers with signature
cast send 0xd694475B5c7D2610dfcBc9F3ea83377A3ac4C5BB \
  "registerHospital(string,string,bytes)" \
  "RS Central" "LIC-2024-001" "0xSIGNATURE" \
  --rpc-url https://rpc.sepolia-api.lisk.com \
  --private-key $HOSPITAL_PRIVATE_KEY

# 4. Verify hospital is registered
cast call 0xd694475B5c7D2610dfcBc9F3ea83377A3ac4C5BB \
  "isHospitalRegistered(address)" $HOSPITAL_ADDRESS \
  --rpc-url https://rpc.sepolia-api.lisk.com
```

### Flow 3: Granting Access & Adding Records

```bash
# 1. Patient grants access to hospital
cast send 0x7568f9E2D79eB7fE4396BC78fbB63303d984901A \
  "grantAccess(address,uint8,uint256)" \
  $HOSPITAL_ADDRESS 3 $(date -d "+30 days" +%s) \
  --rpc-url https://rpc.sepolia-api.lisk.com \
  --private-key $PATIENT_PRIVATE_KEY

# 2. Hospital adds medical record
cast send 0x7568f9E2D79eB7fE4396BC78fbB63303d984901A \
  "addMedicalRecord(address,string,string,string)" \
  $PATIENT_ADDRESS "Blood Test" "QmIpfsHash123" "encryptedKey123" \
  --rpc-url https://rpc.sepolia-api.lisk.com \
  --private-key $HOSPITAL_PRIVATE_KEY

# 3. Check records count
cast call 0x7568f9E2D79eB7fE4396BC78fbB63303d984901A \
  "getPatientRecordCount(address)" $PATIENT_ADDRESS \
  --rpc-url https://rpc.sepolia-api.lisk.com

# 4. Get record details
cast call 0x7568f9E2D79eB7fE4396BC78fbB63303d984901A \
  "getMedicalRecord(address,uint256)" $PATIENT_ADDRESS 1 \
  --rpc-url https://rpc.sepolia-api.lisk.com
```

---

## JavaScript/Ethers.js Integration

### Setup
```javascript
const { ethers } = require('ethers');

const provider = new ethers.JsonRpcProvider('https://rpc.sepolia-api.lisk.com');
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

// Contract ABIs (get from artifacts after compile)
const PATIENT_ADDRESS = '0x7568f9E2D79eB7fE4396BC78fbB63303d984901A';
const HOSPITAL_REGISTRY_ADDRESS = '0xd694475B5c7D2610dfcBc9F3ea83377A3ac4C5BB';

// Load ABIs
const patientABI = require('./out/MedichainPatientIdentity.sol/MedichainPatientIdentity.json').abi;
const hospitalABI = require('./out/AutomatedHospitalRegistry.sol/AutomatedHospitalRegistry.json').abi;

const patientContract = new ethers.Contract(PATIENT_ADDRESS, patientABI, wallet);
const hospitalContract = new ethers.Contract(HOSPITAL_REGISTRY_ADDRESS, hospitalABI, wallet);
```

### Register Patient
```javascript
async function registerPatient() {
    const tx = await patientContract.registerPatient(
        "John Doe",
        "1990-01-15",
        "Male",
        "O+",
        "QmEncryptedDataHash"
    );
    const receipt = await tx.wait();
    console.log('Patient registered, Token ID:', receipt.logs[0].args.tokenId);
}
```

### Grant Access
```javascript
async function grantAccessToHospital(hospitalAddress, days = 30) {
    const expiresAt = Math.floor(Date.now() / 1000) + (days * 24 * 60 * 60);
    const tx = await patientContract.grantAccess(
        hospitalAddress,
        3, // ADD_RECORDS
        expiresAt
    );
    await tx.wait();
    console.log('Access granted to hospital');
}
```

### Add Medical Record (Hospital)
```javascript
async function addMedicalRecord(patientAddress, recordType, ipfsHash, encryptedKey) {
    const tx = await patientContract.addMedicalRecord(
        patientAddress,
        recordType,
        ipfsHash,
        encryptedKey
    );
    const receipt = await tx.wait();
    console.log('Record added, ID:', receipt.logs[0].args.recordId);
}
```

### Check Access
```javascript
async function checkAccess(patientAddress, accessorAddress) {
    const [accessType, grantedAt, expiresAt, isActive] = 
        await patientContract.getAccessPermission(patientAddress, accessorAddress);
    
    console.log({
        accessType: ['NONE', 'VIEW_BASIC', 'VIEW_RECORDS', 'ADD_RECORDS', 'FULL_ACCESS'][accessType],
        grantedAt: new Date(Number(grantedAt) * 1000),
        expiresAt: new Date(Number(expiresAt) * 1000),
        isActive
    });
}
```

---

## 📡 Events to Listen

### MedichainPatientIdentity Events
```solidity
event PatientRegistered(address indexed patient, uint256 tokenId, uint256 timestamp);
event PatientProfileUpdated(address indexed patient, uint256 timestamp);
event AccessGranted(address indexed patient, address indexed accessor, AccessType accessType, uint256 expiresAt);
event AccessRevoked(address indexed patient, address indexed accessor);
event MedicalRecordAdded(address indexed patient, uint256 recordId, address indexed hospital, string recordType);
event MedicalRecordDeactivated(address indexed patient, uint256 recordId);
event HospitalWhitelisted(address indexed hospital);
event HospitalRemovedFromWhitelist(address indexed hospital);
event EmergencyAccessGranted(address indexed patient, address indexed accessor, uint256 expiresAt);
```

### AutomatedHospitalRegistry Events
```solidity
event HospitalRegistered(address indexed hospital, string name, string licenseNumber);
event GovernmentSignerUpdated(address indexed oldSigner, address indexed newSigner);
```

### Listen to Events (JavaScript)
```javascript
// Listen for new patient registrations
patientContract.on('PatientRegistered', (patient, tokenId, timestamp) => {
    console.log(`New patient registered: ${patient}, Token: ${tokenId}`);
});

// Listen for access grants
patientContract.on('AccessGranted', (patient, accessor, accessType, expiresAt) => {
    console.log(`Access granted: ${accessor} can access ${patient}'s records`);
});

// Listen for new medical records
patientContract.on('MedicalRecordAdded', (patient, recordId, hospital, recordType) => {
    console.log(`New record for ${patient}: ${recordType} by ${hospital}`);
});
```

---

## Security Considerations

1. **Soulbound Token (SBT)**: Patient tokens cannot be transferred
2. **Access Expiration**: All access permissions have expiry timestamps
3. **Hospital Verification**: Hospitals must be registered via government signature OR whitelisted in patient contract
4. **Signature Verification**: Meta-transactions use ECDSA signature verification
5. **Reentrancy Protection**: Critical functions are protected with `nonReentrant` modifier
6. **Role-Based Access**: OpenZeppelin AccessControl for admin functions

---

## Support & Links

- **Block Explorer:** https://sepolia-blockscout.lisk.com
- **Lisk Sepolia Faucet:** https://faucet.sepolia-api.lisk.com
- **Contract Source:** Verified on block explorer (if verified)

---

## Useful Cast Commands Reference

```bash
# Set environment variables
export RPC_URL="https://rpc.sepolia-api.lisk.com"
export PATIENT_CONTRACT="0x7568f9E2D79eB7fE4396BC78fbB63303d984901A"
export HOSPITAL_REGISTRY="0xd694475B5c7D2610dfcBc9F3ea83377A3ac4C5BB"

# Check contract owner
cast call $PATIENT_CONTRACT "hasRole(bytes32,address)" \
  $(cast keccak "DEFAULT_ADMIN_ROLE") $YOUR_ADDRESS \
  --rpc-url $RPC_URL

# Get total patients registered
cast call $PATIENT_CONTRACT "getTotalPatients()" --rpc-url $RPC_URL

# Get patient nonce (for meta-transactions)
cast call $PATIENT_CONTRACT "getPatientNonce(address)" $PATIENT_ADDRESS --rpc-url $RPC_URL

# Verify signature
cast call $PATIENT_CONTRACT "verifyPatientSignature(address,bytes32,bytes)" \
  $PATIENT_ADDRESS $MESSAGE_HASH $SIGNATURE \
  --rpc-url $RPC_URL
```
