#!/bin/bash
# ============================================================================
# MEDICHAIN INTERACTION DEMO - COMPLETE FLOW
# ============================================================================
# Script ini mendemonstrasikan interaksi lengkap dengan smart contract Medichain
# dari perspektif berbagai aktor: Admin/RS, Pasien 1 (existing), dan Pasien 2 (new)
# ============================================================================

set -e  # Exit on error

# Load environment variables
source .env

# Contract Addresses (dari deployment)
PATIENT_CONTRACT="0xd694475B5c7D2610dfcBc9F3ea83377A3ac4C5BB"
HOSPITAL_REGISTRY="0x7568f9E2D79eB7fE4396BC78fbB63303d984901A"

# Get addresses from private keys
ADMIN_ADDRESS=$(cast wallet address --private-key $PRIVATE_KEY)
PATIENT1_ADDRESS=$(cast wallet address --private-key $PRIVATE_KEY2)
PATIENT2_ADDRESS=$(cast wallet address --private-key $PRIVATE_KEY5)

echo "============================================================================"
echo "MEDICHAIN INTERACTION DEMO - LISK SEPOLIA TESTNET"
echo "============================================================================"
echo ""
echo "Contract Addresses:"
echo "  MedichainPatientIdentity: $PATIENT_CONTRACT"
echo "  AutomatedHospitalRegistry: $HOSPITAL_REGISTRY"
echo ""
echo "Actors:"
echo "  Admin/Hospital (RS Harapan Kita): $ADMIN_ADDRESS"
echo "  Patient 1 (Budi - existing):      $PATIENT1_ADDRESS"
echo "  Patient 2 (Eka - new):            $PATIENT2_ADDRESS"
echo ""

# Check balances
echo "Checking balances..."
ADMIN_BALANCE=$(cast balance $ADMIN_ADDRESS --rpc-url $RPC_URL --ether)
PATIENT1_BALANCE=$(cast balance $PATIENT1_ADDRESS --rpc-url $RPC_URL --ether)
PATIENT2_BALANCE=$(cast balance $PATIENT2_ADDRESS --rpc-url $RPC_URL --ether)

echo "  Admin Balance:    $ADMIN_BALANCE ETH"
echo "  Patient1 Balance: $PATIENT1_BALANCE ETH"
echo "  Patient2 Balance: $PATIENT2_BALANCE ETH"
echo ""

# Check if Patient 2 needs ETH
PATIENT2_WEI=$(cast balance $PATIENT2_ADDRESS --rpc-url $RPC_URL)
if [ "$PATIENT2_WEI" = "0" ]; then
    echo "⚠️  Patient 2 has no ETH. Sending 0.005 ETH from Admin..."
    cast send $PATIENT2_ADDRESS --value 0.005ether --rpc-url $RPC_URL --private-key $PRIVATE_KEY
    echo "✅ ETH sent to Patient 2"
    echo ""
fi

# ============================================================================
# SCENARIO 1: POV RUMAH SAKIT - Hospital Setup (Skip if already done)
# ============================================================================
echo "============================================================================"
echo "SCENARIO 1: HOSPITAL SETUP (POV Rumah Sakit)"
echo "============================================================================"
echo ""

# Check if hospital is already whitelisted
IS_WHITELISTED=$(cast call $PATIENT_CONTRACT "isHospitalAuthorized(address)(bool)" $ADMIN_ADDRESS --rpc-url $RPC_URL)
echo "Hospital already whitelisted: $IS_WHITELISTED"

if [ "$IS_WHITELISTED" = "false" ]; then
    echo ""
    echo "[STEP 1.1] Admin whitelist RS ke Patient Contract..."
    cast send $PATIENT_CONTRACT "whitelistHospital(address,string)" $ADMIN_ADDRESS "RS Harapan Kita" \
        --rpc-url $RPC_URL \
        --private-key $PRIVATE_KEY
    echo "✅ Hospital RS Harapan Kita whitelisted!"
else
    echo "✅ Hospital already whitelisted, skipping..."
fi
echo ""

# ============================================================================
# SCENARIO 2: POV PASIEN 1 (Existing) - Verify Status
# ============================================================================
echo "============================================================================"
echo "SCENARIO 2: VERIFY PATIENT 1 STATUS (Budi - existing)"
echo "============================================================================"
echo ""

# Check if patient 1 has identity
HAS_IDENTITY1=$(cast call $PATIENT_CONTRACT "hasPatientIdentity(address)(bool)" $PATIENT1_ADDRESS --rpc-url $RPC_URL)
echo "Patient 1 (Budi) has identity: $HAS_IDENTITY1"

if [ "$HAS_IDENTITY1" = "true" ]; then
    PATIENT1_ID=$(cast call $PATIENT_CONTRACT "getPatientId(address)(uint256)" $PATIENT1_ADDRESS --rpc-url $RPC_URL)
    echo "  Token ID: $PATIENT1_ID"
    echo "✅ Patient 1 already registered"
else
    echo "  Patient 1 not yet registered"
fi
echo ""

# ============================================================================
# SCENARIO 3: POV PASIEN 2 (New) - Full Onboarding
# ============================================================================
echo "============================================================================"
echo "SCENARIO 3: NEW PATIENT ONBOARDING (POV Pasien 2 - Eka)"
echo "============================================================================"
echo ""

# Check if patient 2 already has identity
HAS_IDENTITY2=$(cast call $PATIENT_CONTRACT "hasPatientIdentity(address)(bool)" $PATIENT2_ADDRESS --rpc-url $RPC_URL)
echo "Patient 2 (Eka) has identity: $HAS_IDENTITY2"

if [ "$HAS_IDENTITY2" = "false" ]; then
    echo ""
    echo "[STEP 3.1] Eka datang ke RS Harapan Kita untuk pendaftaran..."
    echo "  -> Membuat Smart Wallet: $PATIENT2_ADDRESS"
    echo ""
    
    echo "[STEP 3.2] RS mencetak NFT Identitas (Soulbound Token) untuk Eka..."
    cast send $PATIENT_CONTRACT "mintIdentity(address)" $PATIENT2_ADDRESS \
        --rpc-url $RPC_URL \
        --private-key $PRIVATE_KEY
    
    echo ""
    echo "✅ NFT Identitas berhasil dicetak!"
    sleep 3  # Wait for nonce to update
fi

# Get token ID
PATIENT2_ID=$(cast call $PATIENT_CONTRACT "getPatientId(address)(uint256)" $PATIENT2_ADDRESS --rpc-url $RPC_URL)
echo "  -> Patient: Eka"
echo "  -> Address: $PATIENT2_ADDRESS"
echo "  -> Token ID: $PATIENT2_ID"
echo ""

# ============================================================================
# SCENARIO 4: POV PASIEN 2 - Grant Access to Hospital
# ============================================================================
echo "============================================================================"
echo "SCENARIO 4: GRANT ACCESS TO HOSPITAL (POV Pasien 2 - Eka)"
echo "============================================================================"
echo ""
echo "[POPUP DI HP PASIEN]"
echo "  'RS Harapan Kita meminta izin untuk menambahkan rekam medis.'"
echo "  'Izinkan akses FULL_ACCESS selama 365 hari?'"
echo ""
echo "  [IZINKAN]  [TOLAK]"
echo ""
echo "[PASIEN KLIK 'IZINKAN']..."
echo ""

# Calculate expiry (365 days from now)
EXPIRY=$(date -d "+365 days" +%s)
echo "Access expires at: $(date -d @$EXPIRY)"
echo ""

echo "[STEP 4.1] Eka memberikan akses FULL_ACCESS ke RS Harapan Kita..."
cast send $PATIENT_CONTRACT "grantAccess(address,string,uint256)" $ADMIN_ADDRESS "FULL_ACCESS" $EXPIRY \
    --rpc-url $RPC_URL \
    --private-key $PRIVATE_KEY5

echo ""
echo "✅ Access granted successfully!"
echo ""

# Wait for nonce to update
sleep 3

# ============================================================================
# SCENARIO 5: POV RUMAH SAKIT - Add Medical Records for Patient 2
# ============================================================================
echo "============================================================================"
echo "SCENARIO 5: ADD MEDICAL RECORDS (POV Rumah Sakit)"
echo "============================================================================"
echo ""
echo "[STEP 5.1] Dokter memeriksa Eka dan mendiagnosa Demam Berdarah..."
echo "  -> Diagnosa: Demam Berdarah Dengue (ICD-10: A91)"
echo "  -> Tindakan: Rawat Inap 5 hari"
echo ""
echo "[STEP 5.2] Dokter klik 'Sync to Medichain'..."
echo "  -> Enkripsi data dengan Public Key pasien..."
echo "  -> Upload ke IPFS..."
echo "  -> Membuat Hash SHA-256..."
echo ""
echo "[STEP 5.3] Transaksi ke Lisk Blockchain..."

# Create unique data hash
TIMESTAMP=$(date +%s)
DATA_HASH1=$(cast keccak "DemamBerdarah_Eka_$TIMESTAMP")
echo "  Data Hash: $DATA_HASH1"
echo ""

cast send $PATIENT_CONTRACT "addMedicalRecord(address,string,bytes32,string,string)" \
    $PATIENT2_ADDRESS \
    "QmDemamBerdarahRecord_Eka_001" \
    $DATA_HASH1 \
    "A91" \
    "DIAGNOSIS" \
    --rpc-url $RPC_URL \
    --private-key $PRIVATE_KEY

echo ""
echo "✅ Medical Record 1 added: Demam Berdarah (A91)"
echo ""

# Wait for nonce to update
sleep 3

echo "[STEP 5.4] Menambahkan hasil lab..."
TIMESTAMP2=$(date +%s)
DATA_HASH2=$(cast keccak "LabResult_Eka_$TIMESTAMP2")
echo "  Data Hash: $DATA_HASH2"
echo ""

cast send $PATIENT_CONTRACT "addMedicalRecord(address,string,bytes32,string,string)" \
    $PATIENT2_ADDRESS \
    "QmLabResult_Eka_Trombosit_001" \
    $DATA_HASH2 \
    "D69.6" \
    "LAB_RESULT" \
    --rpc-url $RPC_URL \
    --private-key $PRIVATE_KEY

echo ""
echo "✅ Medical Record 2 added: Lab Result - Trombosit (D69.6)"
echo ""

# Wait for nonce to update
sleep 3

echo "[NOTIFICATION TO PATIENT]"
echo "  📱 Push Notification ke HP Eka:"
echo "  'RS Harapan Kita menambahkan 2 rekam medis baru'"
echo "  '1. Diagnosa - Demam Berdarah Dengue'"
echo "  '2. Lab Result - Trombosit'"
echo ""

# ============================================================================
# SCENARIO 6: POV PASIEN 2 - Data Sharing to Another Hospital
# ============================================================================
echo "============================================================================"
echo "SCENARIO 6: DATA SHARING TO NEW HOSPITAL (POV Pasien 2 - Eka)"
echo "============================================================================"
echo ""
echo "[SCENARIO] Eka pindah ke RS Medistra, dokter meminta data..."
echo ""
echo "[POPUP DI HP PASIEN]"
echo "  'Dr. Sari (RS Medistra) meminta akses riwayat penyakit"
echo "   dalam 1 tahun terakhir. Izinkan?'"
echo ""
echo "  [IZINKAN]  [TOLAK]"
echo ""
echo "[PASIEN KLIK 'IZINKAN']..."
echo ""

# RS Medistra - use a real address derived from PRIVATE_KEY3
# (We'll use the Ani address as RS Medistra for demo)
RS_MEDISTRA=$(cast wallet address --private-key $PRIVATE_KEY3)
EXPIRY_30=$(date -d "+30 days" +%s)

echo "RS Medistra Address: $RS_MEDISTRA"
echo ""

# First, admin must whitelist RS Medistra
IS_MEDISTRA_WHITELISTED=$(cast call $PATIENT_CONTRACT "isHospitalAuthorized(address)(bool)" $RS_MEDISTRA --rpc-url $RPC_URL)
echo "RS Medistra already whitelisted: $IS_MEDISTRA_WHITELISTED"

if [ "$IS_MEDISTRA_WHITELISTED" = "false" ]; then
    echo "[STEP 6.1] Admin whitelisting RS Medistra..."
    cast send $PATIENT_CONTRACT "whitelistHospital(address,string)" $RS_MEDISTRA "RS Medistra" \
        --rpc-url $RPC_URL \
        --private-key $PRIVATE_KEY
    echo "✅ RS Medistra whitelisted!"
    sleep 3
else
    echo "✅ RS Medistra already whitelisted"
fi
echo ""

echo "[STEP 6.2] Granting READ_ONLY access to RS Medistra for 30 days..."
echo "  New Hospital: $RS_MEDISTRA"
echo "  Expires: $(date -d @$EXPIRY_30)"
echo ""

cast send $PATIENT_CONTRACT "grantAccess(address,string,uint256)" \
    $RS_MEDISTRA \
    "READ_ONLY" \
    $EXPIRY_30 \
    --rpc-url $RPC_URL \
    --private-key $PRIVATE_KEY5

echo ""
echo "✅ Access granted to RS Medistra!"
echo "  Dr. Sari sekarang dapat melihat riwayat medis Eka"
echo ""

# ============================================================================
# SCENARIO 7: FINAL DATA VERIFICATION
# ============================================================================
echo "============================================================================"
echo "SCENARIO 7: FINAL DATA VERIFICATION"
echo "============================================================================"
echo ""

echo "[PATIENT 1 - BUDI]"
echo "  Address: $PATIENT1_ADDRESS"
HAS_ID1=$(cast call $PATIENT_CONTRACT "hasPatientIdentity(address)(bool)" $PATIENT1_ADDRESS --rpc-url $RPC_URL)
echo "  Has Identity: $HAS_ID1"
if [ "$HAS_ID1" = "true" ]; then
    TOKEN_ID1=$(cast call $PATIENT_CONTRACT "getPatientId(address)(uint256)" $PATIENT1_ADDRESS --rpc-url $RPC_URL)
    echo "  Token ID: $TOKEN_ID1"
fi
echo ""

echo "[PATIENT 2 - EKA]"
echo "  Address: $PATIENT2_ADDRESS"
HAS_ID2=$(cast call $PATIENT_CONTRACT "hasPatientIdentity(address)(bool)" $PATIENT2_ADDRESS --rpc-url $RPC_URL)
echo "  Has Identity: $HAS_ID2"
if [ "$HAS_ID2" = "true" ]; then
    TOKEN_ID2=$(cast call $PATIENT_CONTRACT "getPatientId(address)(uint256)" $PATIENT2_ADDRESS --rpc-url $RPC_URL)
    echo "  Token ID: $TOKEN_ID2"
fi
echo ""

echo "[HOSPITAL STATUS]"
echo "  RS Harapan Kita ($ADMIN_ADDRESS)"
IS_AUTH=$(cast call $PATIENT_CONTRACT "isHospitalAuthorized(address)(bool)" $ADMIN_ADDRESS --rpc-url $RPC_URL)
echo "  Is Authorized: $IS_AUTH"
echo ""

echo "[TOTAL PATIENTS REGISTERED]"
TOTAL=$(cast call $PATIENT_CONTRACT "getTotalPatients()(uint256)" --rpc-url $RPC_URL)
echo "  Total: $TOTAL"
echo ""

echo "============================================================================"
echo "ALL SCENARIOS COMPLETED SUCCESSFULLY! 🎉"
echo "============================================================================"
echo ""
echo "Summary:"
echo "  ✅ Hospital RS Harapan Kita whitelisted and authorized"
echo "  ✅ Patient 1 (Budi) - Token ID: $TOKEN_ID1"
echo "  ✅ Patient 2 (Eka) - Token ID: $TOKEN_ID2, newly registered"
echo "  ✅ Eka granted FULL_ACCESS to RS Harapan Kita"
echo "  ✅ RS added 2 medical records for Eka"
echo "  ✅ Eka shared READ_ONLY access with RS Medistra"
echo ""
echo "Block Explorer Links:"
echo "  Patient Contract: https://sepolia-blockscout.lisk.com/address/$PATIENT_CONTRACT"
echo "  Hospital Registry: https://sepolia-blockscout.lisk.com/address/$HOSPITAL_REGISTRY"
echo ""
echo "View Transactions:"
echo "  Admin: https://sepolia-blockscout.lisk.com/address/$ADMIN_ADDRESS"
echo "  Patient 1: https://sepolia-blockscout.lisk.com/address/$PATIENT1_ADDRESS"
echo "  Patient 2: https://sepolia-blockscout.lisk.com/address/$PATIENT2_ADDRESS"
echo ""
