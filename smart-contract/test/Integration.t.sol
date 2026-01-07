// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/MedichainPatientIdentity.sol";
import "../src/AutomatedHospitalRegistry.sol";
import "../src/MedichainForwarder.sol";

/**
 * @title IntegrationTest
 * @notice Integration tests to verify MedichainPatientIdentity and AutomatedHospitalRegistry work together
 * @dev Tests the complete flow: Hospital Registration -> Patient Identity -> Medical Records
 */
contract IntegrationTest is Test {
    MedichainPatientIdentity public patientIdentity;
    AutomatedHospitalRegistry public hospitalRegistry;
    MedichainForwarder public forwarder;

    // Accounts
    address public admin;
    uint256 internal systemVerifierPrivateKey = 0x515123;
    address public systemVerifier;
    address public hospital1;
    address public patient1;

    // Test data
    string constant HOSPITAL_NAME = "RS Harapan Sehat";
    string constant LICENSE_NUMBER = "RS-001-LISK";
    string constant IPFS_CID = "QmT5NvUtoM5nWFfrQdVrFtvGfKFmG7AHE8P34isapyhCxX";
    bytes32 constant DATA_HASH = keccak256("medical_data");
    string constant ICD10_CODE = "J06.9";
    string constant RECORD_TYPE = "DIAGNOSIS";

    function setUp() public {
        admin = address(this);
        systemVerifier = vm.addr(systemVerifierPrivateKey);
        hospital1 = vm.addr(0x40571);
        patient1 = vm.addr(0xA71);

        // 1. Deploy Forwarder first (for gasless transactions)
        forwarder = new MedichainForwarder(admin);

        // 2. Deploy HospitalRegistry with forwarder
        hospitalRegistry = new AutomatedHospitalRegistry(
            systemVerifier,
            address(forwarder)
        );

        // 3. Deploy PatientIdentity with reference to HospitalRegistry and forwarder
        patientIdentity = new MedichainPatientIdentity(
            address(hospitalRegistry),
            address(forwarder)
        );
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // INTEGRATION TESTS
    // ═══════════════════════════════════════════════════════════════════════════

    function test_Integration_HospitalRegistryIsLinked() public view {
        assertEq(address(patientIdentity.hospitalRegistry()), address(hospitalRegistry));
    }

    function test_Integration_HospitalRegisteredInRegistryCanAddRecords() public {
        // Step 1: Register hospital in AutomatedHospitalRegistry via signature
        bytes32 messageHash = keccak256(abi.encodePacked(hospital1, LICENSE_NUMBER));
        bytes32 ethSignedMessageHash = keccak256(
            abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash)
        );
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(systemVerifierPrivateKey, ethSignedMessageHash);
        bytes memory signature = abi.encodePacked(r, s, v);

        vm.prank(hospital1);
        hospitalRegistry.registerHospital(HOSPITAL_NAME, LICENSE_NUMBER, signature);

        // Verify hospital is registered
        (,, address wallet, bool isVerified) = hospitalRegistry.hospitals(hospital1);
        assertTrue(isVerified);
        assertEq(wallet, hospital1);

        // Step 2: Hospital should now be authorized in PatientIdentity (via external registry check)
        assertTrue(patientIdentity.isHospitalAuthorized(hospital1));

        // Step 3: Mint patient identity (hospital can do this since it's verified)
        // But first, we need to give hospital HOSPITAL_ROLE in PatientIdentity
        // Note: The registry integration only provides read access, roles still need to be granted
        patientIdentity.whitelistHospital(hospital1, HOSPITAL_NAME);

        vm.prank(hospital1);
        uint256 patientId = patientIdentity.mintIdentity(patient1);
        assertEq(patientId, 1);

        // Step 4: Hospital adds medical record
        vm.prank(hospital1);
        uint256 recordIdx = patientIdentity.addMedicalRecord(
            patient1,
            IPFS_CID,
            DATA_HASH,
            ICD10_CODE,
            RECORD_TYPE
        );
        assertEq(recordIdx, 0);

        // Verify record was added
        assertEq(patientIdentity.getRecordCount(patient1), 1);
    }

    function test_Integration_UnregisteredHospitalCannotAddRecords() public {
        // Hospital NOT registered in registry and NOT whitelisted locally
        address unregisteredHospital = vm.addr(0x00EE6);

        // Mint a patient first (by admin)
        patientIdentity.mintIdentity(patient1);

        // Unregistered hospital tries to add record - should fail
        vm.prank(unregisteredHospital);
        vm.expectRevert(MedichainPatientIdentity.HospitalNotWhitelisted.selector);
        patientIdentity.addMedicalRecord(
            patient1,
            IPFS_CID,
            DATA_HASH,
            ICD10_CODE,
            RECORD_TYPE
        );
    }

    function test_Integration_FullPatientJourney() public {
        // ═══════════════════════════════════════════════════════════════════════
        // COMPLETE END-TO-END FLOW
        // ═══════════════════════════════════════════════════════════════════════

        // 1. HOSPITAL REGISTRATION (via government API signature)
        bytes32 messageHash = keccak256(abi.encodePacked(hospital1, LICENSE_NUMBER));
        bytes32 ethSignedMessageHash = keccak256(
            abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash)
        );
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(systemVerifierPrivateKey, ethSignedMessageHash);
        bytes memory signature = abi.encodePacked(r, s, v);

        vm.prank(hospital1);
        hospitalRegistry.registerHospital(HOSPITAL_NAME, LICENSE_NUMBER, signature);
        console.log("Step 1: Hospital registered in registry");

        // 2. ADMIN WHITELISTS HOSPITAL IN PATIENT IDENTITY SYSTEM
        patientIdentity.whitelistHospital(hospital1, HOSPITAL_NAME);
        console.log("Step 2: Hospital whitelisted in PatientIdentity");

        // 3. HOSPITAL ONBOARDS NEW PATIENT
        vm.prank(hospital1);
        uint256 patientId = patientIdentity.mintIdentity(patient1);
        console.log("Step 3: Patient identity minted, ID:", patientId);

        // 4. HOSPITAL ADDS FIRST MEDICAL RECORD
        vm.prank(hospital1);
        patientIdentity.addMedicalRecord(
            patient1,
            IPFS_CID,
            DATA_HASH,
            ICD10_CODE,
            RECORD_TYPE
        );
        console.log("Step 4: Medical record added");

        // 5. ADMIN VERIFIES THE RECORD
        patientIdentity.verifyRecord(patient1, 0);
        console.log("Step 5: Record verified by admin");

        // 6. PATIENT GRANTS ACCESS TO ANOTHER HOSPITAL
        address hospital2 = vm.addr(0x40572);
        patientIdentity.whitelistHospital(hospital2, "RS Lain");
        
        vm.prank(patient1);
        patientIdentity.grantAccess(hospital2, "FULL", 0);
        console.log("Step 6: Patient granted access to hospital2");

        // 7. HOSPITAL2 VERIFIES ACCESS
        (bool hasAccess,) = patientIdentity.checkAccess(patient1, hospital2);
        assertTrue(hasAccess);
        console.log("Step 7: Hospital2 access verified");

        // 8. VERIFY FINAL STATE
        MedichainPatientIdentity.PatientProfile memory profile = patientIdentity.getPatientProfile(patient1);
        assertTrue(profile.isRegistered);
        assertEq(profile.totalRecords, 1);

        MedichainPatientIdentity.MedicalRecordRef memory record = patientIdentity.getRecordByIndex(patient1, 0);
        assertTrue(record.isVerified);
        assertEq(record.hospitalAddress, hospital1);

        console.log("Step 8: All verifications passed!");
        console.log("");
        console.log("=== INTEGRATION TEST COMPLETE ===");
    }

    function test_Integration_UpdateHospitalRegistry() public {
        // Initially linked to hospitalRegistry
        assertEq(address(patientIdentity.hospitalRegistry()), address(hospitalRegistry));

        // Deploy a new registry
        AutomatedHospitalRegistry newRegistry = new AutomatedHospitalRegistry(
            systemVerifier,
            address(forwarder)
        );

        // Admin updates the registry
        patientIdentity.setHospitalRegistry(address(newRegistry));

        // Verify update
        assertEq(address(patientIdentity.hospitalRegistry()), address(newRegistry));
    }

    function test_Integration_DisableExternalRegistry() public {
        // Disable external registry by setting to address(0)
        patientIdentity.setHospitalRegistry(address(0));
        
        assertEq(address(patientIdentity.hospitalRegistry()), address(0));

        // Now only local whitelist works
        // Whitelist a hospital locally
        patientIdentity.whitelistHospital(hospital1, HOSPITAL_NAME);
        assertTrue(patientIdentity.isHospitalAuthorized(hospital1));

        // Non-whitelisted hospital should not be authorized
        assertFalse(patientIdentity.isHospitalAuthorized(vm.addr(0x0E3)));
    }
}
