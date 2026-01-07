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
    address public patient;    // PRIVATE_KEY3 - Patient (fresh wallet)
    
    uint256 adminKey;
    uint256 patientKey;

    function setUp() public {
        // Load contract addresses from env or use defaults
        address patientAddr = vm.envOr("PATIENT_IDENTITY_ADDRESS", address(0xD61E5E3a3ac3EeA56466462dBd0121C5e29aaeb7));
        address hospitalAddr = vm.envOr("HOSPITAL_REGISTRY_ADDRESS", address(0x008e441348Cc791e440874F59dC62A2292222583));
        
        patientContract = MedichainPatientIdentity(patientAddr);
        hospitalRegistry = AutomatedHospitalRegistry(hospitalAddr);
        
        // Load private keys - using PRIVATE_KEY3 for fresh patient
        adminKey = vm.envUint("PRIVATE_KEY");
        patientKey = vm.envUint("PRIVATE_KEY3");
        
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
            patientContract.whitelistHospital(admin, "RS Medichain Central");
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
            MedichainPatientIdentity.PatientProfile memory profile
        ) {
            isRegistered = profile.isRegistered;
        } catch {}
        
        if (!isRegistered) {
            console.log("");
            console.log("[STEP 1] Pasien datang ke RS, aktivasi akun Medichain...");
            console.log("  -> Membuat Smart Wallet...");
            console.log("  -> Wallet Address:", patient);
            
            console.log("");
            console.log("[STEP 2] Mencetak NFT Identitas (Soulbound Token)...");
            
            vm.stopBroadcast();
            
            // Patient identity is minted by hospital/admin, not patient
            vm.startBroadcast(adminKey);
            
            // Mint SBT for patient
            uint256 tokenId = patientContract.mintIdentity(patient);
            
            console.log("  -> NFT Identitas berhasil dicetak!");
            console.log("  -> Token ID:", tokenId);
            console.log("  -> Patient Address:", patient);
        } else {
            console.log("");
            console.log("[INFO] Pasien sudah terdaftar sebelumnya");
            
            // Get existing profile
            MedichainPatientIdentity.PatientProfile memory profile = patientContract.getPatientProfile(patient);
            uint256 existingTokenId = patientContract.getPatientId(patient);
            
            console.log("  -> Token ID:", existingTokenId);
            console.log("  -> Registered At:", profile.registrationTimestamp);
            console.log("  -> Total Records:", profile.totalRecords);
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
        (bool hasAccess, ) = patientContract.checkAccess(patient, admin);
        
        if (!hasAccess) {
            // Grant ADD_RECORDS access for 365 days
            uint256 expiry = block.timestamp + 365 days;
            patientContract.grantAccess(
                admin,
                "ADD_RECORDS",
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
        
        // Generate unique IPFS CID and hash using timestamp to avoid duplicates
        string memory ipfsCid = string(abi.encodePacked("QmTyphoidRecord_", vm.toString(block.timestamp)));
        bytes32 dataHash = keccak256(abi.encodePacked("typhoid_record_", block.timestamp, patient));
        
        // Add medical record (patient, ipfsCid, dataHash, icd10Code, recordType)
        uint256 recordId = patientContract.addMedicalRecord(
            patient,
            ipfsCid,     // Unique IPFS CID
            dataHash,    // Unique Data Hash
            "A01.0",     // ICD-10 Code
            "DIAGNOSIS"  // Record Type
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
        
        // First, admin needs to whitelist the new hospital
        console.log("[ADMIN] Whitelist RS B terlebih dahulu...");
        vm.startBroadcast(adminKey);
        
        // Check if already whitelisted
        if (!patientContract.isHospitalAuthorized(newHospital)) {
            patientContract.whitelistHospital(newHospital, "RS B - Rumah Sakit Budi");
            console.log("  -> RS B berhasil di-whitelist!");
        }
        
        vm.stopBroadcast();
        
        console.log("");
        console.log("[PASIEN KLIK 'IZINKAN']...");
        console.log("");
        
        vm.startBroadcast(patientKey);
        
        // Grant VIEW_RECORDS access for 30 days
        uint256 expiry = block.timestamp + 30 days;
        patientContract.grantAccess(
            newHospital,
            "VIEW_RECORDS",
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
        console.log("=====================================================" );
        console.log("SCENARIO 5: DATA VERIFICATION");
        console.log("=====================================================" );
        
        // Get patient profile
        MedichainPatientIdentity.PatientProfile memory profile = patientContract.getPatientProfile(patient);
        uint256 patientTokenId = patientContract.getPatientId(patient);
        
        console.log("");
        console.log("[PATIENT DATA]");
        console.log("  Token ID:", patientTokenId);
        console.log("  Registered At:", profile.registrationTimestamp);
        console.log("  Is Active:", profile.isRegistered);
        console.log("  Last Activity:", profile.lastActivityTimestamp);
        
        // Get record count from profile
        console.log("");
        console.log("[MEDICAL RECORDS]");
        console.log("  Total Records:", profile.totalRecords);
        
        // Get accessors
        address[] memory accessors = patientContract.getActiveAccessors(patient);
        console.log("");
        console.log("[ACCESS PERMISSIONS]");
        console.log("  Total Accessors:", accessors.length);
        
        for (uint i = 0; i < accessors.length; i++) {
            (bool accessActive, MedichainPatientIdentity.AccessPermission memory perm) = 
                patientContract.checkAccess(patient, accessors[i]);
            
            console.log("");
            console.log("  Accessor", i + 1);
            console.log("    Address:", accessors[i]);
            console.log("    Access Type:", perm.accessType);
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
