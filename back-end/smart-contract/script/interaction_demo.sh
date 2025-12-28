#!/bin/bash
# ============================================================================
# MEDICHAIN INTERACTION DEMO - STEP BY STEP
# ============================================================================
# Script ini mendemonstrasikan interaksi dengan smart contract Medichain
# dari perspektif berbagai aktor: Admin/RS, Pasien, dan Validator
# ============================================================================

# Load environment variables
source .env

# Contract Addresses (dari deployment terakhir)
PATIENT_CONTRACT="0xd694475B5c7D2610dfcBc9F3ea83377A3ac4C5BB"
HOSPITAL_REGISTRY="0x7568f9E2D79eB7fE4396BC78fbB63303d984901A"

# Get addresses from private keys
ADMIN_ADDRESS=$(cast wallet address --private-key $PRIVATE_KEY)
PATIENT_ADDRESS=$(cast wallet address --private-key $PRIVATE_KEY2)

echo "============================================================================"
echo "MEDICHAIN INTERACTION DEMO - LISK SEPOLIA TESTNET"
echo "============================================================================"
echo ""
echo "Contract Addresses:"
echo "  MedichainPatientIdentity: $PATIENT_CONTRACT"
echo "  AutomatedHospitalRegistry: $HOSPITAL_REGISTRY"
echo ""
echo "Actors:"
echo "  Admin/Hospital: $ADMIN_ADDRESS"
echo "  Patient: $PATIENT_ADDRESS"
echo ""

# ============================================================================
# SCENARIO 1: POV RUMAH SAKIT - Hospital Setup
# ============================================================================
echo "============================================================================"
echo "SCENARIO 1: HOSPITAL SETUP (POV Rumah Sakit)"
echo "============================================================================"
echo ""
echo "[STEP 1] Admin whitelist hospital ke Patient Contract..."
echo ""

# Check if hospital is already whitelisted
IS_WHITELISTED=$(cast call $PATIENT_CONTRACT "isHospitalAuthorized(address)" $ADMIN_ADDRESS --rpc-url $RPC_URL)
echo "Currently whitelisted: $IS_WHITELISTED"

if [ "$IS_WHITELISTED" = "0x0000000000000000000000000000000000000000000000000000000000000000" ]; then
    echo ""
    echo "Whitelisting hospital..."
    cast send $PATIENT_CONTRACT "whitelistHospital(address)" $ADMIN_ADDRESS \
        --rpc-url $RPC_URL \
        --private-key $PRIVATE_KEY
    echo "-> Hospital berhasil di-whitelist!"
else
    echo "-> Hospital sudah ter-whitelist sebelumnya"
fi

echo ""
echo "[SUCCESS] Hospital setup complete!"
echo ""

# ============================================================================
# SCENARIO 2: POV PASIEN - Patient Onboarding
# ============================================================================
echo "============================================================================"
echo "SCENARIO 2: PATIENT ONBOARDING (POV Pasien)"
echo "============================================================================"
echo ""
echo "[STEP 1] Pasien datang ke RS, aktivasi akun Medichain..."
echo "  -> Membuat Smart Wallet..."
echo "  -> Wallet Address: $PATIENT_ADDRESS"
echo ""

# Check if patient is already registered
echo "Checking if patient is registered..."
PATIENT_REGISTERED=$(cast call $PATIENT_CONTRACT "getPatientProfile(address)" $PATIENT_ADDRESS --rpc-url $RPC_URL 2>&1)

if [[ "$PATIENT_REGISTERED" == *"revert"* ]] || [[ "$PATIENT_REGISTERED" == *"error"* ]]; then
    echo ""
    echo "[STEP 2] Mencetak NFT Identitas (Soulbound Token)..."
    echo ""
    echo "Registering patient..."
    
    cast send $PATIENT_CONTRACT \
        "registerPatient(string,string,string,string,string)" \
        "Budi Santoso" \
        "1990-05-15" \
        "Laki-laki" \
        "O+" \
        "QmPatientEncryptedDataHash123" \
        --rpc-url $RPC_URL \
        --private-key $PRIVATE_KEY2
    
    echo ""
    echo "-> NFT Identitas berhasil dicetak!"
else
    echo "-> Patient sudah terdaftar sebelumnya"
fi

echo ""
echo "[SUCCESS] Patient onboarding complete!"
echo ""

# Get patient profile
echo "Patient Profile:"
cast call $PATIENT_CONTRACT "getPatientProfile(address)" $PATIENT_ADDRESS --rpc-url $RPC_URL

echo ""

# ============================================================================
# SCENARIO 3: POV PASIEN - Grant Access to Hospital
# ============================================================================
echo "============================================================================"
echo "SCENARIO 3: GRANT ACCESS TO HOSPITAL (POV Pasien)"
echo "============================================================================"
echo ""
echo "[POPUP DI HP PASIEN]"
echo "  'RS Harapan Kita meminta izin untuk menambahkan rekam medis.'"
echo "  'Izinkan akses selama 365 hari?'"
echo ""
echo "  [IZINKAN]  [TOLAK]"
echo ""
echo "[PASIEN KLIK 'IZINKAN']..."
echo ""

# Calculate expiry (current timestamp + 365 days)
EXPIRY=$(date -d "+365 days" +%s)
echo "Access will expire at: $EXPIRY ($(date -d @$EXPIRY))"
echo ""

echo "Granting ADD_RECORDS (3) access to hospital..."
cast send $PATIENT_CONTRACT \
    "grantAccess(address,uint8,uint256)" \
    $ADMIN_ADDRESS \
    3 \
    $EXPIRY \
    --rpc-url $RPC_URL \
    --private-key $PRIVATE_KEY2

echo ""
echo "[SUCCESS] Access granted to hospital!"
echo ""

# Verify access
echo "Verifying access permission..."
cast call $PATIENT_CONTRACT "getAccessPermission(address,address)" $PATIENT_ADDRESS $ADMIN_ADDRESS --rpc-url $RPC_URL

echo ""

# ============================================================================
# SCENARIO 4: POV RUMAH SAKIT - Add Medical Record
# ============================================================================
echo "============================================================================"
echo "SCENARIO 4: ADD MEDICAL RECORD (POV Rumah Sakit)"
echo "============================================================================"
echo ""
echo "[STEP 1] Dokter input diagnosa di sistem EHR RS..."
echo "  -> Diagnosa: Demam Tifoid (A01.0)"
echo "  -> Tindakan: Rawat Inap 3 hari"
echo ""
echo "[STEP 2] Dokter klik 'Sync to Medichain'..."
echo "  -> Enkripsi data dengan Public Key pasien..."
echo "  -> Upload ke IPFS..."
echo "  -> Membuat Hash SHA-256..."
echo ""
echo "[STEP 3] Transaksi ke Lisk Blockchain..."
echo ""

echo "Adding medical record..."
cast send $PATIENT_CONTRACT \
    "addMedicalRecord(address,string,string,string)" \
    $PATIENT_ADDRESS \
    "Diagnosa - Demam Tifoid (ICD-10: A01.0)" \
    "QmTyphoidRecordIPFSHash12345" \
    "aes256_encrypted_key_base64" \
    --rpc-url $RPC_URL \
    --private-key $PRIVATE_KEY

echo ""
echo "[NOTIFICATION TO PATIENT]"
echo "  -> Push Notification: 'RS Harapan Kita menambahkan rekam medis baru'"
echo "  -> Record Type: Diagnosa - Demam Tifoid"
echo ""
echo "[SUCCESS] Medical record added!"
echo ""

# Get record count
echo "Patient record count:"
cast call $PATIENT_CONTRACT "getPatientRecordCount(address)" $PATIENT_ADDRESS --rpc-url $RPC_URL

echo ""

# ============================================================================
# SCENARIO 5: POV PASIEN - Data Sharing to New Hospital
# ============================================================================
echo "============================================================================"
echo "SCENARIO 5: DATA SHARING TO NEW HOSPITAL (POV Pasien)"
echo "============================================================================"
echo ""
echo "[SCENARIO] Pasien pindah ke RS B, dokter meminta data..."
echo ""
echo "[POPUP DI HP PASIEN]"
echo "  'Dr. Budi (RS B) meminta akses riwayat penyakit"
echo "   dalam 1 tahun terakhir. Izinkan?'"
echo ""
echo "  [IZINKAN]  [TOLAK]"
echo ""
echo "[PASIEN KLIK 'IZINKAN']..."
echo ""

# Simulated new hospital address
NEW_HOSPITAL="0x1234567890AbcdEF1234567890aBcdef12345678"
EXPIRY_30=$(date -d "+30 days" +%s)

echo "Granting VIEW_RECORDS (2) access to new hospital..."
echo "  New Hospital: $NEW_HOSPITAL"
echo "  Expires: $EXPIRY_30 ($(date -d @$EXPIRY_30))"
echo ""

cast send $PATIENT_CONTRACT \
    "grantAccess(address,uint8,uint256)" \
    $NEW_HOSPITAL \
    2 \
    $EXPIRY_30 \
    --rpc-url $RPC_URL \
    --private-key $PRIVATE_KEY2

echo ""
echo "[SUCCESS] Access granted to RS B!"
echo "  Dr. Budi sekarang dapat melihat riwayat medis pasien"
echo ""

# ============================================================================
# SCENARIO 6: DATA VERIFICATION
# ============================================================================
echo "============================================================================"
echo "SCENARIO 6: FINAL DATA VERIFICATION"
echo "============================================================================"
echo ""

echo "[PATIENT PROFILE]"
cast call $PATIENT_CONTRACT "getPatientProfile(address)" $PATIENT_ADDRESS --rpc-url $RPC_URL
echo ""

echo "[TOTAL MEDICAL RECORDS]"
cast call $PATIENT_CONTRACT "getPatientRecordCount(address)" $PATIENT_ADDRESS --rpc-url $RPC_URL
echo ""

echo "[ACCESS PERMISSIONS - All Accessors]"
cast call $PATIENT_CONTRACT "getPatientAccessors(address)" $PATIENT_ADDRESS --rpc-url $RPC_URL
echo ""

echo "[HOSPITAL AUTHORIZATION STATUS]"
echo "Hospital $ADMIN_ADDRESS authorized:"
cast call $PATIENT_CONTRACT "isHospitalAuthorized(address)" $ADMIN_ADDRESS --rpc-url $RPC_URL
echo ""

echo "============================================================================"
echo "ALL SCENARIOS COMPLETED SUCCESSFULLY!"
echo "============================================================================"
echo ""
echo "Summary:"
echo "  ✅ Hospital whitelisted and authorized"
echo "  ✅ Patient registered with SBT"
echo "  ✅ Patient granted access to hospital"
echo "  ✅ Hospital added medical record"
echo "  ✅ Patient shared data with new hospital"
echo ""
echo "Block Explorer Links:"
echo "  Patient Contract: https://sepolia-blockscout.lisk.com/address/$PATIENT_CONTRACT"
echo "  Hospital Registry: https://sepolia-blockscout.lisk.com/address/$HOSPITAL_REGISTRY"
echo ""
