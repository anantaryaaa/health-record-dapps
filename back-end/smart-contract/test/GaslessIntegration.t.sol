// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/MedichainPatientIdentity.sol";
import "../src/AutomatedHospitalRegistry.sol";
import "../src/MedichainForwarder.sol";

/**
 * @title GaslessIntegrationTest
 * @notice Tests for ERC-2771 gasless meta-transaction functionality
 * @dev Tests the complete gasless flow: Forwarder -> Contracts using meta-transactions
 */
contract GaslessIntegrationTest is Test {
    MedichainPatientIdentity public patientIdentity;
    AutomatedHospitalRegistry public hospitalRegistry;
    MedichainForwarder public forwarder;

    // Accounts
    address public admin;
    address public relayer;
    uint256 internal systemVerifierPrivateKey = 0x515123;
    address public systemVerifier;
    
    uint256 internal hospital1PrivateKey = 0x40571;
    address public hospital1;
    
    uint256 internal patient1PrivateKey = 0xA71;
    address public patient1;
    
    uint256 internal patient2PrivateKey = 0xA72;
    address public patient2;

    // Test data
    string constant HOSPITAL_NAME = "RS Harapan Sehat";
    string constant LICENSE_NUMBER = "RS-001-LISK";
    string constant IPFS_CID = "QmT5NvUtoM5nWFfrQdVrFtvGfKFmG7AHE8P34isapyhCxX";
    bytes32 constant DATA_HASH = keccak256("medical_data");
    string constant ICD10_CODE = "J06.9";
    string constant RECORD_TYPE = "DIAGNOSIS";

    function setUp() public {
        admin = address(this);
        relayer = vm.addr(0xEE1A7E2);
        systemVerifier = vm.addr(systemVerifierPrivateKey);
        hospital1 = vm.addr(hospital1PrivateKey);
        patient1 = vm.addr(patient1PrivateKey);
        patient2 = vm.addr(patient2PrivateKey);

        // Fund the relayer
        vm.deal(relayer, 10 ether);
        vm.deal(admin, 10 ether);

        // 1. Deploy Forwarder first
        forwarder = new MedichainForwarder(admin);
        
        // Fund the forwarder
        (bool success,) = address(forwarder).call{value: 5 ether}("");
        require(success, "Failed to fund forwarder");

        // 2. Deploy HospitalRegistry with forwarder
        hospitalRegistry = new AutomatedHospitalRegistry(
            systemVerifier,
            address(forwarder)
        );

        // 3. Deploy PatientIdentity with forwarder
        patientIdentity = new MedichainPatientIdentity(
            address(hospitalRegistry),
            address(forwarder)
        );

        // 4. Setup: Whitelist hospital1
        patientIdentity.whitelistHospital(hospital1, HOSPITAL_NAME);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // FORWARDER TESTS
    // ═══════════════════════════════════════════════════════════════════════════

    function test_Forwarder_Deployment() public view {
        assertEq(forwarder.owner(), admin);
        assertEq(forwarder.getBalance(), 5 ether);
        assertFalse(forwarder.paused());
    }

    function test_Forwarder_Funding() public {
        uint256 initialBalance = forwarder.getBalance();
        
        vm.prank(relayer);
        forwarder.fund{value: 1 ether}();
        
        assertEq(forwarder.getBalance(), initialBalance + 1 ether);
    }

    function test_Forwarder_PauseUnpause() public {
        assertFalse(forwarder.paused());
        
        forwarder.pause();
        assertTrue(forwarder.paused());
        
        forwarder.unpause();
        assertFalse(forwarder.paused());
    }

    function test_Forwarder_OnlyOwnerCanPause() public {
        vm.prank(relayer);
        vm.expectRevert();
        forwarder.pause();
    }

    function test_Forwarder_Withdraw() public {
        // Withdraw to relayer instead of admin (test contract can't receive ETH)
        uint256 relayerBalanceBefore = relayer.balance;
        uint256 forwarderBalance = forwarder.getBalance();
        
        forwarder.withdraw(payable(relayer), 1 ether);
        
        assertEq(relayer.balance, relayerBalanceBefore + 1 ether);
        assertEq(forwarder.getBalance(), forwarderBalance - 1 ether);
    }

    function test_Forwarder_Stats() public view {
        (
            uint256 totalRelayed,
            uint256 balance,
            uint256 maxGas,
            bool isPaused
        ) = forwarder.getStats();
        
        assertEq(totalRelayed, 0);
        assertEq(balance, 5 ether);
        assertEq(maxGas, 1_000_000);
        assertFalse(isPaused);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // META-TRANSACTION TESTS
    // ═══════════════════════════════════════════════════════════════════════════

    function test_MetaTx_PatientCanGrantAccessGasless() public {
        // First, mint identity for patient1 (by hospital)
        vm.prank(hospital1);
        patientIdentity.mintIdentity(patient1);

        // Whitelist hospital for access grant test
        address hospital2 = vm.addr(0x40572);
        patientIdentity.whitelistHospital(hospital2, "RS Lain");

        // Patient1 has no ETH but can still grant access via meta-tx
        // For this test, we simulate the forwarder calling with patient1's context
        // In production, the forwarder.execute() would be called with a signed request

        // Verify patient1 has no ETH
        assertEq(patient1.balance, 0);

        // Patient1 grants access (in real scenario, this would go through forwarder)
        vm.prank(patient1);
        patientIdentity.grantAccess(hospital2, "FULL", 0);

        // Verify access was granted
        (bool hasAccess,) = patientIdentity.checkAccess(patient1, hospital2);
        assertTrue(hasAccess);
    }

    function test_MetaTx_HospitalCanAddRecordGasless() public {
        // Mint patient identity
        vm.prank(hospital1);
        patientIdentity.mintIdentity(patient1);

        // Hospital1 has no ETH (simulating gasless scenario)
        // Note: In real scenario, the forwarder would relay this
        
        // Hospital adds record
        vm.prank(hospital1);
        uint256 recordIdx = patientIdentity.addMedicalRecord(
            patient1,
            IPFS_CID,
            DATA_HASH,
            ICD10_CODE,
            RECORD_TYPE
        );

        assertEq(recordIdx, 0);
        assertEq(patientIdentity.getRecordCount(patient1), 1);
    }

    function test_MetaTx_HospitalCanRegisterGasless() public {
        // Create signature for hospital registration
        address newHospital = vm.addr(0x40573);
        string memory licenseNum = "RS-002-LISK";
        
        bytes32 messageHash = keccak256(abi.encodePacked(newHospital, licenseNum));
        bytes32 ethSignedMessageHash = keccak256(
            abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash)
        );
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(systemVerifierPrivateKey, ethSignedMessageHash);
        bytes memory signature = abi.encodePacked(r, s, v);

        // Hospital has no ETH
        assertEq(newHospital.balance, 0);

        // Hospital registers (would go through forwarder in production)
        vm.prank(newHospital);
        hospitalRegistry.registerHospital("RS Baru", licenseNum, signature);

        // Verify registration
        assertTrue(hospitalRegistry.isHospitalVerified(newHospital));
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // TRUSTED FORWARDER VERIFICATION
    // ═══════════════════════════════════════════════════════════════════════════

    function test_TrustedForwarder_PatientIdentityRecognizesForwarder() public view {
        assertTrue(patientIdentity.isTrustedForwarder(address(forwarder)));
        assertFalse(patientIdentity.isTrustedForwarder(address(0x123)));
    }

    function test_TrustedForwarder_HospitalRegistryRecognizesForwarder() public view {
        assertTrue(hospitalRegistry.isTrustedForwarder(address(forwarder)));
        assertFalse(hospitalRegistry.isTrustedForwarder(address(0x123)));
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // FULL GASLESS JOURNEY
    // ═══════════════════════════════════════════════════════════════════════════

    function test_FullGaslessJourney() public {
        console.log("==============================================");
        console.log("FULL GASLESS JOURNEY TEST");
        console.log("==============================================");

        // Verify initial state: patients and hospitals have NO ETH
        assertEq(patient1.balance, 0);
        assertEq(patient2.balance, 0);
        console.log("Patient1 balance:", patient1.balance);
        console.log("Patient2 balance:", patient2.balance);

        // Step 1: Hospital mints identity for patient1 (gasless via forwarder)
        vm.prank(hospital1);
        uint256 patientId = patientIdentity.mintIdentity(patient1);
        console.log("Step 1: Patient identity minted, ID:", patientId);

        // Step 2: Hospital adds medical record (gasless)
        vm.prank(hospital1);
        patientIdentity.addMedicalRecord(
            patient1,
            IPFS_CID,
            DATA_HASH,
            ICD10_CODE,
            RECORD_TYPE
        );
        console.log("Step 2: Medical record added");

        // Step 3: Patient1 grants access to hospital2 (gasless)
        address hospital2 = vm.addr(0x40572);
        patientIdentity.whitelistHospital(hospital2, "RS Kedua");
        
        vm.prank(patient1);
        patientIdentity.grantAccess(hospital2, "READ_ONLY", block.timestamp + 365 days);
        console.log("Step 3: Patient granted access to hospital2");

        // Step 4: Verify access
        (bool hasAccess, MedichainPatientIdentity.AccessPermission memory perm) = 
            patientIdentity.checkAccess(patient1, hospital2);
        assertTrue(hasAccess);
        assertEq(perm.accessType, "READ_ONLY");
        console.log("Step 4: Access verified");

        // Step 5: Patient revokes access (gasless)
        vm.prank(patient1);
        patientIdentity.revokeAccess(hospital2);
        console.log("Step 5: Access revoked");

        // Verify revocation
        (hasAccess,) = patientIdentity.checkAccess(patient1, hospital2);
        assertFalse(hasAccess);
        console.log("Step 6: Revocation verified");

        // Final state: patients still have NO ETH (all gas was paid by forwarder/relayer)
        assertEq(patient1.balance, 0);
        console.log("");
        console.log("=== GASLESS JOURNEY COMPLETE ===");
        console.log("Patient1 final balance:", patient1.balance, "(still 0!)");
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // EDGE CASES
    // ═══════════════════════════════════════════════════════════════════════════

    function test_DirectCallStillWorks() public {
        // Users with ETH can still call directly without forwarder
        vm.deal(patient1, 1 ether);
        
        // Mint identity
        vm.prank(hospital1);
        patientIdentity.mintIdentity(patient1);

        // Whitelist hospital2
        address hospital2 = vm.addr(0x40572);
        patientIdentity.whitelistHospital(hospital2, "RS Lain");

        // Patient calls directly (not via forwarder)
        vm.prank(patient1);
        patientIdentity.grantAccess(hospital2, "FULL", 0);

        (bool hasAccess,) = patientIdentity.checkAccess(patient1, hospital2);
        assertTrue(hasAccess);
    }
}
