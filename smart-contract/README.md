# Medichain - Decentralized Health Record Smart Contracts

Deployed on Lisk Sepolia Testnet  
Last Updated: January 7, 2026

This repository contains the smart contracts for the Medichain decentralized health record management system. The system enables secure, patient-controlled medical data sharing between healthcare institutions with full blockchain verification and IPFS storage.

## Deployed Contracts

| Contract | Address | Explorer |
|----------|---------|----------|
| MedichainForwarder | 0xE2446A9d664bC4E160Af2b0F25BF6530b75250d5 | [View](https://sepolia-blockscout.lisk.com/address/0xE2446A9d664bC4E160Af2b0F25BF6530b75250d5) |
| AutomatedHospitalRegistry | 0x7062ebd5d2796aEA3Aa03281e955994661080108 | [View](https://sepolia-blockscout.lisk.com/address/0x7062ebd5d2796aEA3Aa03281e955994661080108) |
| MedichainPatientIdentity | 0x19Ab8F63ED13ae191A8080c9638eefe86bF8ffbC | [View](https://sepolia-blockscout.lisk.com/address/0x19Ab8F63ED13ae191A8080c9638eefe86bF8ffbC) |
| MedichainPatientProfile | 0x11dB04B254f4e355B07b53c53476b0d3bd864142 | [View](https://sepolia-blockscout.lisk.com/address/0x11dB04B254f4e355B07b53c53476b0d3bd864142) |
| MedichainHospitalProfile | 0x6040F415CBAd77722F8afF246a16471c10876C2d | [View](https://sepolia-blockscout.lisk.com/address/0x6040F415CBAd77722F8afF246a16471c10876C2d) |

Network: Lisk Sepolia Testnet (Chain ID: 4202)  
RPC URL: https://rpc.sepolia-api.lisk.com  
Deployer/Owner: 0x8b9616c56fc48cf040F7204CFD6D67ef34f6CF21

## Core Features

Patient Identity Management
- Soulbound Token (SBT) - Non-transferable patient identity NFT
- One address = one identity (prevents duplication)
- Only whitelisted hospitals can mint identities
- Self-registration option for patients

Hospital Management
- Admin whitelist hospitals by name
- Whitelisted hospitals can mint identities and add records
- Hospital registration with government signature verification
- Hospital profile storage on-chain for transparency

Access Control
- Patients grant access to hospitals with custom duration
- Access types: READ_ONLY or FULL_ACCESS
- Automatic access expiration based on timestamp
- Patients can revoke access anytime
- Access request workflow (request -> approve/reject)

Medical Records
- Records stored with IPFS references
- Data hash for integrity verification
- ICD-10 codes for diagnosis standardization
- Record types: DIAGNOSIS, LAB_RESULT, etc.
- Record verification on-chain

Cross-Device Synchronization
- Encrypted patient profile storage on-chain
- Hospital profile storage on-chain
- Metadata tracking (creation time, update time)
- Access logging and audit trail

Gasless Transactions
- ERC2771 meta-transaction forwarder
- Single and batch transaction execution
- Signature verification
- Fund management for relayer

## Contract Structure

```
src/
├── MedichainPatientIdentity.sol    # Main contract (SBT + Access Control + Medical Records)
├── MedichainPatientProfile.sol     # Encrypted patient profile storage on-chain
├── MedichainHospitalProfile.sol    # Hospital profile storage on-chain
├── AutomatedHospitalRegistry.sol   # Hospital registration with gov signature
├── MedichainForwarder.sol          # ERC2771 meta-transaction forwarder
└── PatientRegistry.sol             # Legacy/alternative patient registry
```

## Contract Details

### MedichainPatientIdentity.sol

Main contract managing patient identity, access control, and medical records.

Key Functions:
- selfRegister() - Patient self-register for identity NFT
- mintIdentity(address _patientWallet) - Hospital mint identity for patient
- grantAccess(address _accessor, string _accessType, uint256 _expiresAt) - Patient grant access
- revokeAccess(address _accessor) - Patient revoke access
- checkAccess(address _patient, address _accessor) - Check if accessor has access
- requestAccess(address _patient, string _hospitalName, uint256 _accessDuration, string _message) - Hospital request access
- approveAccessRequest(uint256 _requestIndex) - Patient approve request
- rejectAccessRequest(uint256 _requestIndex) - Patient reject request
- addMedicalRecord(address _patient, string _ipfsCid, bytes32 _dataHash, string _icd10Code, string _recordType) - Add record
- getPatientRecords(address _patient) - Get all patient records
- getRecordByIndex(address _patient, uint256 _recordIndex) - Get specific record
- verifyRecord(address _patient, uint256 _recordIndex) - Verify record
- hasPatientIdentity(address _wallet) - Check if wallet has identity
- getPatientProfile(address _patient) - Get patient profile info
- getAccessRequests(address _patient) - Get all access requests
- getPendingAccessRequests(address _patient) - Get pending requests only

Events:
- IdentityMinted, AccessGranted, AccessRevoked, AccessRequested, AccessRequestApproved, AccessRequestRejected, RecordAdded, RecordVerified

### MedichainPatientProfile.sol

Stores encrypted patient profile data on-chain for cross-device synchronization.

Key Functions:
- setProfile(bytes _encryptedData) - Set encrypted patient profile
- updateProfile(bytes _encryptedData) - Update encrypted patient profile
- deleteProfile() - Delete patient profile
- hasProfile(address _patient) - Check if patient has profile
- getProfile(address _patient) - Get encrypted profile (logs access)
- getProfileView(address _patient) - Get encrypted profile (view only, no logging)
- getProfileMetadata(address _patient) - Get profile metadata (exists, timestamps, size)
- getAccessHistory() - Get access logs for caller's profile
- getAccessHistoryFor(address _patient) - Get access logs for specific patient
- getRecentAccessLogs(address _patient, uint256 _count) - Get recent access logs

Events:
- ProfileCreated, ProfileUpdated, ProfileDeleted, ProfileAccessed

### MedichainHospitalProfile.sol

Stores hospital profile data on-chain for transparency and verification.

Key Functions:
- setProfile(string _hospitalType, string _physicalAddress, string _city, string _phone, string _picName, string _picPosition, string _picPhone, string _picEmail) - Set hospital profile
- updateProfile(...) - Update hospital profile
- getProfile(address _hospital) - Get full hospital profile
- getBasicInfo(address _hospital) - Get basic info (name, type, city, verified, active)
- getProfileMetadata(address _hospital) - Get metadata (timestamps, active status)
- hasProfile(address _hospital) - Check if hospital has profile
- isHospitalActive(address _hospital) - Check if hospital is active (verified + active)
- deactivateProfile() - Deactivate hospital profile
- reactivateProfile() - Reactivate hospital profile
- getHospitalsByCity(string _city) - Get hospitals by city
- getHospitalByIndex(uint256 _index) - Get hospital by index
- getTotalHospitals() - Get total hospitals count

Events:
- ProfileCreated, ProfileUpdated, ProfileDeactivated, ProfileReactivated

### AutomatedHospitalRegistry.sol

Hospital registration with government signature verification.

Key Functions:
- registerHospital(string _name, string _licenseNumber, bytes _signature) - Register hospital with signature
- getHospitalDetails(address _hospital) - Get hospital details
- isHospitalVerified(address _hospital) - Check if hospital verified

Events:
- HospitalRegistered

### MedichainForwarder.sol

ERC2771 meta-transaction forwarder enabling gasless transactions.

Key Functions:
- execute(ForwardRequestData _request) - Execute single forward request
- executeBatch(ForwardRequestData[] _requests, address _refundReceiver) - Execute batch requests
- verify(ForwardRequestData _request) - Verify forward request signature
- fund() - Fund the forwarder (payable)
- withdraw(address payable _to, uint256 _amount) - Withdraw funds
- getStats() - Get forwarder stats (totalRelayed, balance, maxGas, isPaused)
- pause() - Pause forwarder
- unpause() - Unpause forwarder

Events:
- ExecutedForwardRequest, MetaTransactionRelayed, RelayerFunded, FundsWithdrawn

## Usage Flow

```
1. HOSPITAL ONBOARDING
   Admin -> whitelistHospital(address, "RS Harapan Kita")

2. HOSPITAL PROFILE SETUP (Optional - for cross-device sync)
   Hospital -> setProfile(type, address, city, phone, pic...)
   (Stored on MedichainHospitalProfile contract)

3. PATIENT REGISTRATION
   Hospital -> mintIdentity(patientAddress)
   Patient receives Soulbound Token (NFT)

4. PATIENT PROFILE SETUP (Optional - for cross-device sync)
   Patient -> setProfile(encryptedData)
   (Stored on MedichainPatientProfile contract)

5. GRANT ACCESS
   Patient -> grantAccess(hospitalAddress, "FULL_ACCESS", expiryTime)

6. ADD MEDICAL RECORD
   Hospital -> addMedicalRecord(patient, ipfsCid, dataHash, icd10, type)

7. SHARE WITH NEW HOSPITAL
   Admin -> whitelistHospital(newHospitalAddress, "RS Medistra")
   Patient -> grantAccess(newHospital, "READ_ONLY", expiryTime)
```

## Build and Test

Prerequisites
- Foundry installed (https://book.getfoundry.sh/)
- Node.js (optional, for scripts)

Build
```bash
forge build
```

Test
```bash
forge test -vv
```

Deploy to Lisk Sepolia
```bash
# Copy .env.example to .env and fill your private key
cp .env.example .env

# Deploy
forge script script/DeployMedichain.s.sol:DeployMedichain \
  --rpc-url https://rpc.sepolia-api.lisk.com \
  --broadcast \
  --verify
```

## Quick Start - Contract Interaction

Setup Environment
```bash
source .env
export PATIENT_CONTRACT="0x19Ab8F63ED13ae191A8080c9638eefe86bF8ffbC"
export HOSPITAL_REGISTRY="0x7062ebd5d2796aEA3Aa03281e955994661080108"
export PATIENT_PROFILE="0x11dB04B254f4e355B07b53c53476b0d3bd864142"
export HOSPITAL_PROFILE="0x6040F415CBAd77722F8afF246a16471c10876C2d"
export FORWARDER="0xE2446A9d664bC4E160Af2b0F25BF6530b75250d5"
export RPC_URL="https://rpc.sepolia-api.lisk.com"
```

1. Whitelist Hospital (Admin)
```bash
cast send $PATIENT_CONTRACT "whitelistHospital(address,string)" \
  0xHOSPITAL_ADDRESS "RS Harapan Kita" \
  --rpc-url $RPC_URL --private-key $PRIVATE_KEY
```

2. Mint Patient Identity (Hospital)
```bash
cast send $PATIENT_CONTRACT "mintIdentity(address)" \
  0xPATIENT_ADDRESS \
  --rpc-url $RPC_URL --private-key $HOSPITAL_PRIVATE_KEY
```

3. Grant Access (Patient)
```bash
EXPIRY=$(date -d "+365 days" +%s)
cast send $PATIENT_CONTRACT "grantAccess(address,string,uint256)" \
  0xHOSPITAL_ADDRESS "FULL_ACCESS" $EXPIRY \
  --rpc-url $RPC_URL --private-key $PATIENT_PRIVATE_KEY
```

4. Add Medical Record (Hospital)
```bash
DATA_HASH=$(cast keccak "DiagnosisRecord_$(date +%s)")
cast send $PATIENT_CONTRACT "addMedicalRecord(address,string,bytes32,string,string)" \
  0xPATIENT_ADDRESS "QmIPFSHash" $DATA_HASH "A91" "DIAGNOSIS" \
  --rpc-url $RPC_URL --private-key $HOSPITAL_PRIVATE_KEY
```

5. Set Hospital Profile (Hospital - Optional, for cross-device sync)
```bash
cast send $HOSPITAL_PROFILE "setProfile(string,string,string,string,string,string,string,string)" \
  "Rumah Sakit Harapan Kita" \
  "Rumah Sakit Umum" \
  "Jl. Merdeka No. 123, Jakarta" \
  "Jakarta" \
  "021-1234567" \
  "Dr. Budi Santoso" \
  "Direktur Utama" \
  "budi@rshk.id" \
  --rpc-url $RPC_URL --private-key $HOSPITAL_PRIVATE_KEY
```

6. Set Patient Profile (Patient - Optional, for cross-device sync)
```bash
# Encrypt patient data first (using encryption key derived from wallet signature)
ENCRYPTED_DATA="0x..." # Encrypted patient profile data

cast send $PATIENT_PROFILE "setProfile(bytes)" \
  $ENCRYPTED_DATA \
  --rpc-url $RPC_URL --private-key $PATIENT_PRIVATE_KEY
```

7. Verify Patient Identity
```bash
cast call $PATIENT_CONTRACT "hasPatientIdentity(address)(bool)" \
  0xPATIENT_ADDRESS --rpc-url $RPC_URL
```

## Complete Demo

Execute the full interaction demo with all scenarios:

```bash
./script/interaction_demo.sh
```

This demonstrates:
- Hospital whitelist
- Patient identity minting (SBT)
- Patient granting access to hospital
- Hospital adding medical records
- Patient sharing data with new hospital
- Final verification

## Contract Functions Reference

MedichainPatientIdentity.sol - Key Functions

Patient Registration:
- selfRegister() - Patient self-register to get identity NFT
- mintIdentity(address _patientWallet) - Hospital mint identity for patient

Access Control:
- grantAccess(address _accessor, string _accessType, uint256 _expiresAt) - Patient grant access
- revokeAccess(address _accessor) - Patient revoke access
- checkAccess(address _patient, address _accessor) - Check if accessor has access
- requestAccess(address _patient, string _hospitalName, uint256 _accessDuration, string _message) - Hospital request access
- approveAccessRequest(uint256 _requestIndex) - Patient approve request
- rejectAccessRequest(uint256 _requestIndex) - Patient reject request

Medical Records:
- addMedicalRecord(address _patient, string _ipfsCid, bytes32 _dataHash, string _icd10Code, string _recordType) - Add record
- getPatientRecords(address _patient) - Get all patient records
- getRecordByIndex(address _patient, uint256 _recordIndex) - Get specific record
- verifyRecord(address _patient, uint256 _recordIndex) - Verify record

Query:
- hasPatientIdentity(address _wallet) - Check if wallet has identity
- getPatientProfile(address _patient) - Get patient profile info
- getAccessRequests(address _patient) - Get all access requests
- getPendingAccessRequests(address _patient) - Get pending requests only

MedichainPatientProfile.sol - Key Functions

Profile Management:
- setProfile(bytes _encryptedData) - Set encrypted patient profile
- updateProfile(bytes _encryptedData) - Update encrypted patient profile
- deleteProfile() - Delete patient profile
- hasProfile(address _patient) - Check if patient has profile

Data Access:
- getProfile(address _patient) - Get encrypted profile (logs access)
- getProfileView(address _patient) - Get encrypted profile (view only, no logging)
- getProfileMetadata(address _patient) - Get profile metadata (exists, timestamps, size)
- getAccessHistory() - Get access logs for caller's profile
- getAccessHistoryFor(address _patient) - Get access logs for specific patient

MedichainHospitalProfile.sol - Key Functions

Profile Management:
- setProfile(string _hospitalType, string _physicalAddress, string _city, string _phone, string _picName, string _picPosition, string _picPhone, string _picEmail) - Set hospital profile
- updateProfile(...) - Update hospital profile
- getProfile(address _hospital) - Get full hospital profile
- getBasicInfo(address _hospital) - Get basic info (name, type, city, verified, active)
- getProfileMetadata(address _hospital) - Get metadata (timestamps, active status)
- hasProfile(address _hospital) - Check if hospital has profile
- isHospitalActive(address _hospital) - Check if hospital is active (verified + active)
- deactivateProfile() - Deactivate hospital profile
- reactivateProfile() - Reactivate hospital profile

Enumeration:
- getHospitalsByCity(string _city) - Get all hospitals in city
- getHospitalByIndex(uint256 _index) - Get hospital by index
- getTotalHospitals() - Get total hospitals count

AutomatedHospitalRegistry.sol - Key Functions

Registration:
- registerHospital(string _name, string _licenseNumber, bytes _signature) - Register hospital with signature

Query:
- getHospitalDetails(address _hospital) - Get hospital details
- isHospitalVerified(address _hospital) - Check if hospital verified

MedichainForwarder.sol - Key Functions

Execution:
- execute(ForwardRequestData _request) - Execute single forward request
- executeBatch(ForwardRequestData[] _requests, address _refundReceiver) - Execute batch requests

Verification:
- verify(ForwardRequestData _request) - Verify forward request signature

Fund Management:
- fund() - Fund the forwarder (payable)
- withdraw(address payable _to, uint256 _amount) - Withdraw funds
- getStats() - Get forwarder stats (totalRelayed, balance, maxGas, isPaused)

## Documentation

- CONTRACT_INTERACTION.md - Complete interaction guide with all commands
- docs/ - Additional documentation

## Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| HospitalNotWhitelisted | Hospital not whitelisted | Admin must whitelist hospital first |
| PatientNotRegistered | Patient has no identity | Hospital must mint identity for patient |
| nonce too low | Transactions sent too fast | Add sleep 3 between transactions |
| AccessExpired | Access permission expired | Patient must grant new access |
| AccessNotGranted | Hospital doesn't have access | Patient must grant access first |

## Security

- Soulbound Token: Patient identities cannot be transferred
- Access Expiration: All permissions have expiry timestamps
- Whitelist Requirement: Only whitelisted hospitals can interact
- Role-Based Access: OpenZeppelin AccessControl
- Reentrancy Protection: nonReentrant modifier on critical functions
- Signature Verification: ECDSA for government verification
- Encrypted Storage: Patient profiles encrypted before on-chain storage

## Links

- Block Explorer: https://sepolia-blockscout.lisk.com
- Lisk Sepolia Faucet: https://faucet.sepolia-api.lisk.com
- Foundry Docs: https://book.getfoundry.sh/
- OpenZeppelin Contracts: https://docs.openzeppelin.com/contracts/

---

Contributions and questions are welcome through the repository.
