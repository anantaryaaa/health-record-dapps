// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/MedichainPatientIdentity.sol";
import "../src/AutomatedHospitalRegistry.sol";

/**
 * @title InteractionDemo
 * @notice Demo script untuk simulasi interaksi real-world dengan Medichain
 * 
 * STUDI KASUS:
 * 1. POV RUMAH SAKIT - Registrasi RS dan setup sebagai data creator
 * 2. POV PASIEN - Registrasi pasien, mendapat SBT, kelola izin akses
 * 3. POV VALIDATOR - Verifikasi data (dalam konteks ini: RS yang verified)
 */
contract InteractionDemo is Script {
    // Contract Addresses (dari deployment)
    MedichainPatientIdentity public patientContract;
    AutomatedHospitalRegistry public hospitalRegistry;
    
    // Actors
    address public admin;      // PRIVATE_KEY - Admin/Hospital
    address public patient;    // PRIVATE_KEY2 - Patient
    
    uint256 adminKey;
    uint256 patientKey;

    function setUp() public {
        // Load contract addresses
        patientContract = MedichainPatientIdentity(0xd694475B5c7D2610dfcBc9F3ea83377A3ac4C5BB);
        hospitalRegistry = AutomatedHospitalRegistry(0x7568f9E2D79eB7fE4396BC78fbB63303d984901A);
        
        // Load private keys
        adminKey = vm.envUint("PRIVATE_KEY");
        patientKey = vm.envUint("PRIVATE_KEY2");
        
        admin = vm.addr(adminKey);
        patient = vm.addr(patientKey);
    }

    function run() public {
        console.log("=====================================================");
        console.log("MEDICHAIN INTERACTION DEMO - LISK SEPOLIA");
        console.log("=====================================================");
        console.log("");
        console.log("Actors:");
        console.log("  Admin/Hospital Address:", admin);
        console.log("  Patient Address:", patient);
        console.log("");
        
        // Run all scenarios
        scenario1_HospitalSetup();
        scenario2_PatientOnboarding();
        scenario3_MedicalRecordCreation();
        scenario4_DataSharing();
        scenario5_CheckData();
    }

    /**
     * =========================================================================
     * STUDI KASUS 1: POV RUMAH SAKIT - Setup & Registrasi
     * =========================================================================
     * Tujuan: RS mendaftar ke sistem dan menjadi entitas terpercaya
     */
    function scenario1_HospitalSetup() public {
        console.log("=====================================================");
        console.log("SCENARIO 1: HOSPITAL SETUP (POV Rumah Sakit)");
        console.log("=====================================================");
        
        vm.startBroadcast(adminKey);
        
        // Step 1: Admin whitelist hospital address di Patient Contract
        console.log("");
        console.log("[STEP 1] Admin whitelist RS ke MedichainPatientIdentity...");
        
        // Check if already whitelisted
        bool isWhitelisted = patientContract.isHospitalAuthorized(admin);
        if (!isWhitelisted) {
            patientContract.whitelistHospital(admin);
            console.log("  -> RS berhasil di-whitelist!");
        } else {
            console.log("  -> RS sudah ter-whitelist sebelumnya");
        }
        
        // Step 2: Verify hospital has HOSPITAL_ROLE
        bytes32 hospitalRole = patientContract.HOSPITAL_ROLE();
        bool hasHospitalRole = patientContract.hasRole(hospitalRole, admin);
        console.log("");
        console.log("[STEP 2] Verifikasi HOSPITAL_ROLE...");
        console.log("  -> Has HOSPITAL_ROLE:", hasHospitalRole);
        
        vm.stopBroadcast();
        
        console.log("");
        console.log("[SUCCESS] Hospital setup complete!");
        console.log("  RS Address:", admin);
        console.log("  Can add medical records: true");
        console.log("");
    }

    /**
     * =========================================================================
     * STUDI KASUS 2: POV PASIEN - Onboarding & Registrasi
     * =========================================================================
     * Tujuan: Pasien mendaftar dan mendapat NFT Identitas (Soulbound Token)
     */
    function scenario2_PatientOnboarding() public {
        console.log("=====================================================");
        console.log("SCENARIO 2: PATIENT ONBOARDING (POV Pasien)");
        console.log("=====================================================");
        
        vm.startBroadcast(patientKey);
        
        // Check if patient already registered
        bool isRegistered = false;
        try patientContract.getPatientProfile(patient) returns (
            string memory, string memory, string memory, string memory,
            uint256, uint256, bool _isActive
        ) {
            isRegistered = _isActive;
        } catch {}
        
        if (!isRegistered) {
            console.log("");
            console.log("[STEP 1] Pasien datang ke RS, aktivasi akun Medichain...");
            console.log("  -> Membuat Smart Wallet...");
            console.log("  -> Wallet Address:", patient);
            
            console.log("");
            console.log("[STEP 2] Mencetak NFT Identitas (Soulbound Token)...");
            
            // Register patient - mints SBT
            uint256 tokenId = patientContract.registerPatient(
                "Budi Santoso",           // Nama (encrypted in real scenario)
                "1990-05-15",             // Tanggal Lahir
                "Laki-laki",              // Gender
                "O+",                     // Golongan Darah
                "QmPatientEncryptedData123" // Hash data terenkripsi di IPFS
            );
            
            console.log("  -> NFT Identitas berhasil dicetak!");
            console.log("  -> Token ID:", tokenId);
            console.log("  -> Patient ID: Anonim (hashed on-chain)");
        } else {
            console.log("");
            console.log("[INFO] Pasien sudah terdaftar sebelumnya");
            
            // Get existing profile
            (
                string memory name,
                string memory dob,
                string memory gender,
                string memory bloodType,
                uint256 tokenId,
                uint256 registeredAt,
                bool isActive
            ) = patientContract.getPatientProfile(patient);
            
            console.log("  -> Nama:", name);
            console.log("  -> Token ID:", tokenId);
            console.log("  -> Registered At:", registeredAt);
        }
        
        vm.stopBroadcast();
        
        console.log("");
        console.log("[SUCCESS] Patient onboarding complete!");
        console.log("  Patient Address:", patient);
        console.log("  Has SBT: true");
        console.log("");
    }

    /**
     * =========================================================================
     * STUDI KASUS 3: POV RUMAH SAKIT - Input Data Medis
     * =========================================================================
     * Tujuan: Dokter menambahkan rekam medis ke blockchain
     */
    function scenario3_MedicalRecordCreation() public {
        console.log("=====================================================");
        console.log("SCENARIO 3: MEDICAL RECORD CREATION (POV RS)");
        console.log("=====================================================");
        
        // First, patient needs to grant access to hospital
        console.log("");
        console.log("[PRE-STEP] Pasien memberikan izin ADD_RECORDS ke RS...");
        
        vm.startBroadcast(patientKey);
        
        // Check current access
        (
            MedichainPatientIdentity.AccessType currentAccess,
            ,
            uint256 expiresAt,
            bool isActive
        ) = patientContract.getAccessPermission(patient, admin);
        
        if (!isActive || currentAccess < MedichainPatientIdentity.AccessType.ADD_RECORDS) {
            // Grant ADD_RECORDS access for 365 days
            uint256 expiry = block.timestamp + 365 days;
            patientContract.grantAccess(
                admin,
                MedichainPatientIdentity.AccessType.ADD_RECORDS,
                expiry
            );
            console.log("  -> Access granted to hospital for 365 days");
        } else {
            console.log("  -> Hospital already has access");
        }
        
        vm.stopBroadcast();
        
        // Now hospital adds medical record
        console.log("");
        console.log("[STEP 1] Dokter input diagnosa di sistem EHR RS...");
        console.log("  -> Diagnosa: Demam Tifoid (A01.0)");
        console.log("  -> Tindakan: Rawat Inap 3 hari");
        
        console.log("");
        console.log("[STEP 2] Dokter klik 'Sync to Medichain'...");
        console.log("  -> Enkripsi data dengan Public Key pasien...");
        console.log("  -> Upload ke IPFS...");
        console.log("  -> Membuat Hash SHA-256...");
        
        vm.startBroadcast(adminKey);
        
        console.log("");
        console.log("[STEP 3] Transaksi ke Lisk Blockchain...");
        
        // Add medical record
        uint256 recordId = patientContract.addMedicalRecord(
            patient,
            "Diagnosa - Demam Tifoid (ICD-10: A01.0)",  // Record Type
            "QmTyphoidRecordIPFSHash12345",             // IPFS CID
            "aes256_encrypted_key_base64_here"          // Encrypted decryption key
        );
        
        console.log("  -> Record ID:", recordId);
        console.log("  -> Status: VERIFIED (auto-verified by whitelisted RS)");
        console.log("  -> Timestamp:", block.timestamp);
        
        vm.stopBroadcast();
        
        // Notify patient
        console.log("");
        console.log("[NOTIFICATION TO PATIENT]");
        console.log("  -> Push Notification: 'RS Harapan Kita menambahkan rekam medis baru'");
        console.log("  -> Record Type: Diagnosa - Demam Tifoid");
        console.log("");
    }

    /**
     * =========================================================================
     * STUDI KASUS 4: POV PASIEN - Data Sharing ke RS Lain
     * =========================================================================
     * Tujuan: Pasien pindah RS dan memberikan akses ke dokter baru
     */
    function scenario4_DataSharing() public {
        console.log("=====================================================");
        console.log("SCENARIO 4: DATA SHARING (POV Pasien)");
        console.log("=====================================================");
        
        console.log("");
        console.log("[SCENARIO] Pasien pindah ke RS B, dokter meminta data...");
        console.log("");
        console.log("[POPUP DI HP PASIEN]");
        console.log("  'Dr. Budi (RS B) meminta akses riwayat penyakit");
        console.log("   dalam 1 tahun terakhir. Izinkan?'");
        console.log("");
        console.log("  [IZINKAN]  [TOLAK]");
        console.log("");
        
        // Simulate new hospital address (for demo, we'll use a derived address)
        address newHospital = address(uint160(uint256(keccak256(abi.encodePacked("RS_B_Address")))));
        
        console.log("[PASIEN KLIK 'IZINKAN']...");
        console.log("");
        
        vm.startBroadcast(patientKey);
        
        // Grant VIEW_RECORDS access for 30 days
        uint256 expiry = block.timestamp + 30 days;
        patientContract.grantAccess(
            newHospital,
            MedichainPatientIdentity.AccessType.VIEW_RECORDS,
            expiry
        );
        
        console.log("[TRANSAKSI BLOCKCHAIN]");
        console.log("  -> Digital Signature: Signed by patient wallet");
        console.log("  -> Access Type: VIEW_RECORDS");
        console.log("  -> Expires: 30 days from now");
        console.log("  -> Granted To:", newHospital);
        
        vm.stopBroadcast();
        
        console.log("");
        console.log("[SUCCESS] Access granted!");
        console.log("  Dr. Budi sekarang dapat melihat riwayat medis pasien");
        console.log("");
    }

    /**
     * =========================================================================
     * STUDI KASUS 5: Verifikasi & Cek Data
     * =========================================================================
     * Tujuan: Menampilkan status akhir semua data
     */
    function scenario5_CheckData() public view {
        console.log("=====================================================");
        console.log("SCENARIO 5: DATA VERIFICATION");
        console.log("=====================================================");
        
        // Get patient profile
        (
            string memory name,
            string memory dob,
            string memory gender,
            string memory bloodType,
            uint256 tokenId,
            uint256 registeredAt,
            bool isActive
        ) = patientContract.getPatientProfile(patient);
        
        console.log("");
        console.log("[PATIENT DATA]");
        console.log("  Name:", name);
        console.log("  DOB:", dob);
        console.log("  Gender:", gender);
        console.log("  Blood Type:", bloodType);
        console.log("  Token ID:", tokenId);
        console.log("  Registered At:", registeredAt);
        console.log("  Is Active:", isActive);
        
        // Get record count
        uint256 recordCount = patientContract.getPatientRecordCount(patient);
        console.log("");
        console.log("[MEDICAL RECORDS]");
        console.log("  Total Records:", recordCount);
        
        // Get accessors
        address[] memory accessors = patientContract.getPatientAccessors(patient);
        console.log("");
        console.log("[ACCESS PERMISSIONS]");
        console.log("  Total Accessors:", accessors.length);
        
        for (uint i = 0; i < accessors.length; i++) {
            (
                MedichainPatientIdentity.AccessType accessType,
                uint256 grantedAt,
                uint256 expiresAt,
                bool accessActive
            ) = patientContract.getAccessPermission(patient, accessors[i]);
            
            console.log("");
            console.log("  Accessor", i + 1);
            console.log("    Address:", accessors[i]);
            console.log("    Access Type:", uint8(accessType));
            console.log("    Active:", accessActive);
        }
        
        // Hospital check
        bool hospitalAuthorized = patientContract.isHospitalAuthorized(admin);
        console.log("");
        console.log("[HOSPITAL STATUS]");
        console.log("  Hospital Address:", admin);
        console.log("  Is Authorized:", hospitalAuthorized);
        
        console.log("");
        console.log("=====================================================");
        console.log("ALL SCENARIOS COMPLETED SUCCESSFULLY!");
        console.log("=====================================================");
    }
}
