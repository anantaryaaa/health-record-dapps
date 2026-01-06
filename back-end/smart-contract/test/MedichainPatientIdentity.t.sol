// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/MedichainPatientIdentity.sol";
import "../src/MedichainForwarder.sol";

/**
 * @title MedichainPatientIdentityTest
 * @notice Comprehensive test suite for MedichainPatientIdentity contract
 * @dev Tests all functionalities including identity minting, access control,
 *      medical records management, and hospital whitelist management
 */
contract MedichainPatientIdentityTest is Test {
    MedichainPatientIdentity public patientIdentity;
    MedichainForwarder public forwarder;

    // Test accounts
    address public admin;
    address public hospital1;
    address public hospital2;
    address public patient1;
    address public patient2;
    address public unauthorizedUser;

    // Test private keys for signature testing
    uint256 internal patient1PrivateKey = 0x1234567890abcdef;
    uint256 internal patient2PrivateKey = 0xabcdef1234567890;

    // Test data
    string constant HOSPITAL_NAME_1 = "RS Harapan Sehat";
    string constant HOSPITAL_NAME_2 = "Klinik Medika Prima";
    string constant IPFS_CID_1 = "QmT5NvUtoM5nWFfrQdVrFtvGfKFmG7AHE8P34isapyhCxX";
    string constant IPFS_CID_2 = "QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG";
    bytes32 constant DATA_HASH_1 = keccak256("medical_record_data_1");
    bytes32 constant DATA_HASH_2 = keccak256("medical_record_data_2");
    string constant ICD10_CODE_1 = "J06.9"; // Upper respiratory infection
    string constant ICD10_CODE_2 = "E11.9"; // Type 2 diabetes
    string constant RECORD_TYPE_DIAGNOSIS = "DIAGNOSIS";
    string constant RECORD_TYPE_LAB = "LAB_RESULT";
    string constant ACCESS_TYPE_FULL = "FULL";
    string constant ACCESS_TYPE_READ = "READ_ONLY";

    // Events for testing
    event IdentityMinted(address indexed patientWallet, uint256 indexed patientId, uint256 timestamp);
    event AccessGranted(address indexed patient, address indexed accessor, string accessType, uint256 expiresAt);
    event AccessRevoked(address indexed patient, address indexed accessor, uint256 timestamp);
    event RecordAdded(address indexed patient, address indexed hospital, string ipfsCid, uint256 recordIndex, string icd10Code);
    event RecordVerified(address indexed patient, uint256 recordIndex, uint256 timestamp);
    event HospitalWhitelisted(address indexed hospital, string hospitalName);
    event HospitalRemovedFromWhitelist(address indexed hospital);

    function setUp() public {
        // Setup test accounts
        admin = address(this); // Test contract is deployer/admin
        hospital1 = vm.addr(0xA1);
        hospital2 = vm.addr(0xA2);
        patient1 = vm.addr(patient1PrivateKey);
        patient2 = vm.addr(patient2PrivateKey);
        unauthorizedUser = vm.addr(0xDEAD);

        // Deploy forwarder first
        forwarder = new MedichainForwarder(admin);

        // Deploy contract (no external hospital registry for basic tests)
        patientIdentity = new MedichainPatientIdentity(address(0), address(forwarder));

        // Whitelist hospitals for subsequent tests
        patientIdentity.whitelistHospital(hospital1, HOSPITAL_NAME_1);
        patientIdentity.whitelistHospital(hospital2, HOSPITAL_NAME_2);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // DEPLOYMENT TESTS
    // ═══════════════════════════════════════════════════════════════════════════

    function test_Deployment_SetsCorrectName() public view {
        assertEq(patientIdentity.name(), "Medichain Patient Identity");
    }

    function test_Deployment_SetsCorrectSymbol() public view {
        assertEq(patientIdentity.symbol(), "MEDID");
    }

    function test_Deployment_AdminHasDefaultAdminRole() public view {
        assertTrue(patientIdentity.hasRole(patientIdentity.DEFAULT_ADMIN_ROLE(), admin));
    }

    function test_Deployment_AdminHasAdminRole() public view {
        assertTrue(patientIdentity.hasRole(patientIdentity.ADMIN_ROLE(), admin));
    }

    function test_Deployment_TotalPatientsIsZero() public view {
        assertEq(patientIdentity.getTotalPatients(), 0);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // IDENTITY MINTING TESTS
    // ═══════════════════════════════════════════════════════════════════════════

    function test_MintIdentity_ByAdmin_Success() public {
        vm.expectEmit(true, true, false, true);
        emit IdentityMinted(patient1, 1, block.timestamp);

        uint256 patientId = patientIdentity.mintIdentity(patient1);

        assertEq(patientId, 1);
        assertEq(patientIdentity.ownerOf(1), patient1);
        assertEq(patientIdentity.walletToPatientId(patient1), 1);
        assertEq(patientIdentity.patientIdToWallet(1), patient1);
        assertTrue(patientIdentity.hasPatientIdentity(patient1));
    }

    function test_MintIdentity_ByHospital_Success() public {
        vm.prank(hospital1);
        uint256 patientId = patientIdentity.mintIdentity(patient1);

        assertEq(patientId, 1);
        assertTrue(patientIdentity.hasPatientIdentity(patient1));
    }

    function test_MintIdentity_MultiplePatientsGetSequentialIds() public {
        uint256 id1 = patientIdentity.mintIdentity(patient1);
        uint256 id2 = patientIdentity.mintIdentity(patient2);

        assertEq(id1, 1);
        assertEq(id2, 2);
        assertEq(patientIdentity.getTotalPatients(), 2);
    }

    function test_MintIdentity_PatientProfileCreatedCorrectly() public {
        patientIdentity.mintIdentity(patient1);

        MedichainPatientIdentity.PatientProfile memory profile = patientIdentity.getPatientProfile(patient1);

        assertTrue(profile.isRegistered);
        assertEq(profile.registrationTimestamp, block.timestamp);
        assertEq(profile.totalRecords, 0);
        assertEq(profile.lastActivityTimestamp, block.timestamp);
    }

    function test_MintIdentity_RevertIfAlreadyRegistered() public {
        patientIdentity.mintIdentity(patient1);

        vm.expectRevert(MedichainPatientIdentity.PatientAlreadyRegistered.selector);
        patientIdentity.mintIdentity(patient1);
    }

    function test_MintIdentity_RevertIfZeroAddress() public {
        vm.expectRevert(MedichainPatientIdentity.ZeroAddressNotAllowed.selector);
        patientIdentity.mintIdentity(address(0));
    }

    function test_MintIdentity_RevertIfUnauthorized() public {
        vm.prank(unauthorizedUser);
        vm.expectRevert("Caller is not authorized to mint identities");
        patientIdentity.mintIdentity(patient1);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // SOULBOUND TOKEN TESTS
    // ═══════════════════════════════════════════════════════════════════════════

    function test_Soulbound_TransferReverts() public {
        patientIdentity.mintIdentity(patient1);

        vm.prank(patient1);
        vm.expectRevert(MedichainPatientIdentity.SoulboundTokenNonTransferable.selector);
        patientIdentity.transferFrom(patient1, patient2, 1);
    }

    function test_Soulbound_SafeTransferReverts() public {
        patientIdentity.mintIdentity(patient1);

        vm.prank(patient1);
        vm.expectRevert(MedichainPatientIdentity.SoulboundTokenNonTransferable.selector);
        patientIdentity.safeTransferFrom(patient1, patient2, 1);
    }

    function test_Soulbound_ApproveReverts() public {
        patientIdentity.mintIdentity(patient1);

        vm.prank(patient1);
        vm.expectRevert(MedichainPatientIdentity.SoulboundTokenNonTransferable.selector);
        patientIdentity.approve(patient2, 1);
    }

    function test_Soulbound_SetApprovalForAllReverts() public {
        patientIdentity.mintIdentity(patient1);

        vm.prank(patient1);
        vm.expectRevert(MedichainPatientIdentity.SoulboundTokenNonTransferable.selector);
        patientIdentity.setApprovalForAll(patient2, true);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // ACCESS CONTROL TESTS
    // ═══════════════════════════════════════════════════════════════════════════

    function test_GrantAccess_Success() public {
        patientIdentity.mintIdentity(patient1);

        vm.prank(patient1);
        vm.expectEmit(true, true, false, true);
        emit AccessGranted(patient1, hospital1, ACCESS_TYPE_FULL, 0);
        patientIdentity.grantAccess(hospital1, ACCESS_TYPE_FULL, 0);

        (bool hasAccess, MedichainPatientIdentity.AccessPermission memory perm) = 
            patientIdentity.checkAccess(patient1, hospital1);

        assertTrue(hasAccess);
        assertTrue(perm.isGranted);
        assertEq(perm.accessType, ACCESS_TYPE_FULL);
        assertEq(perm.expiresAt, 0);
    }

    function test_GrantAccess_WithExpiry() public {
        patientIdentity.mintIdentity(patient1);
        uint256 expiryTime = block.timestamp + 1 days;

        vm.prank(patient1);
        patientIdentity.grantAccess(hospital1, ACCESS_TYPE_READ, expiryTime);

        (bool hasAccess, MedichainPatientIdentity.AccessPermission memory perm) = 
            patientIdentity.checkAccess(patient1, hospital1);

        assertTrue(hasAccess);
        assertEq(perm.expiresAt, expiryTime);
    }

    function test_GrantAccess_ExpiryInPast_Reverts() public {
        patientIdentity.mintIdentity(patient1);
        
        // Warp to a realistic timestamp first (Foundry default is 1)
        vm.warp(1000000);
        uint256 pastTime = block.timestamp - 1;

        vm.prank(patient1);
        vm.expectRevert(MedichainPatientIdentity.InvalidExpiryTimestamp.selector);
        patientIdentity.grantAccess(hospital1, ACCESS_TYPE_FULL, pastTime);
    }

    function test_GrantAccess_ToNonWhitelistedHospital_Reverts() public {
        patientIdentity.mintIdentity(patient1);

        vm.prank(patient1);
        vm.expectRevert(MedichainPatientIdentity.HospitalNotWhitelisted.selector);
        patientIdentity.grantAccess(unauthorizedUser, ACCESS_TYPE_FULL, 0);
    }

    function test_GrantAccess_NotRegisteredPatient_Reverts() public {
        vm.prank(patient1);
        vm.expectRevert(MedichainPatientIdentity.PatientNotRegistered.selector);
        patientIdentity.grantAccess(hospital1, ACCESS_TYPE_FULL, 0);
    }

    function test_RevokeAccess_Success() public {
        patientIdentity.mintIdentity(patient1);

        vm.startPrank(patient1);
        patientIdentity.grantAccess(hospital1, ACCESS_TYPE_FULL, 0);

        vm.expectEmit(true, true, false, true);
        emit AccessRevoked(patient1, hospital1, block.timestamp);
        patientIdentity.revokeAccess(hospital1);
        vm.stopPrank();

        (bool hasAccess,) = patientIdentity.checkAccess(patient1, hospital1);
        assertFalse(hasAccess);
    }

    function test_RevokeAccess_NotGranted_Reverts() public {
        patientIdentity.mintIdentity(patient1);

        vm.prank(patient1);
        vm.expectRevert(MedichainPatientIdentity.AccessNotGranted.selector);
        patientIdentity.revokeAccess(hospital1);
    }

    function test_CheckAccess_ExpiredAccess_ReturnsFalse() public {
        patientIdentity.mintIdentity(patient1);
        uint256 expiryTime = block.timestamp + 1 hours;

        vm.prank(patient1);
        patientIdentity.grantAccess(hospital1, ACCESS_TYPE_FULL, expiryTime);

        // Fast forward past expiry
        vm.warp(block.timestamp + 2 hours);

        (bool hasAccess,) = patientIdentity.checkAccess(patient1, hospital1);
        assertFalse(hasAccess);
    }

    function test_GetActiveAccessors_FiltersExpiredAndRevoked() public {
        patientIdentity.mintIdentity(patient1);
        uint256 expiryTime = block.timestamp + 1 hours;

        vm.startPrank(patient1);
        // Grant permanent access to hospital1
        patientIdentity.grantAccess(hospital1, ACCESS_TYPE_FULL, 0);
        // Grant temporary access to hospital2
        patientIdentity.grantAccess(hospital2, ACCESS_TYPE_READ, expiryTime);
        vm.stopPrank();

        // Before expiry: both should be active
        address[] memory activeAccessors = patientIdentity.getActiveAccessors(patient1);
        assertEq(activeAccessors.length, 2);

        // After expiry: only hospital1 should be active
        vm.warp(block.timestamp + 2 hours);
        activeAccessors = patientIdentity.getActiveAccessors(patient1);
        assertEq(activeAccessors.length, 1);
        assertEq(activeAccessors[0], hospital1);
    }

    function test_GetGrantedAccessList_IncludesAllGrantedAddresses() public {
        patientIdentity.mintIdentity(patient1);

        vm.startPrank(patient1);
        patientIdentity.grantAccess(hospital1, ACCESS_TYPE_FULL, 0);
        patientIdentity.grantAccess(hospital2, ACCESS_TYPE_READ, 0);
        vm.stopPrank();

        address[] memory grantedList = patientIdentity.getGrantedAccessList(patient1);
        assertEq(grantedList.length, 2);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // MEDICAL RECORD TESTS
    // ═══════════════════════════════════════════════════════════════════════════

    function test_AddMedicalRecord_Success() public {
        patientIdentity.mintIdentity(patient1);

        vm.prank(hospital1);
        vm.expectEmit(true, true, false, true);
        emit RecordAdded(patient1, hospital1, IPFS_CID_1, 0, ICD10_CODE_1);
        uint256 recordIndex = patientIdentity.addMedicalRecord(
            patient1,
            IPFS_CID_1,
            DATA_HASH_1,
            ICD10_CODE_1,
            RECORD_TYPE_DIAGNOSIS
        );

        assertEq(recordIndex, 0);
        assertEq(patientIdentity.getRecordCount(patient1), 1);

        MedichainPatientIdentity.MedicalRecordRef memory record = 
            patientIdentity.getRecordByIndex(patient1, 0);

        assertEq(record.ipfsCid, IPFS_CID_1);
        assertEq(record.dataHash, DATA_HASH_1);
        assertEq(record.hospitalAddress, hospital1);
        assertEq(record.icd10Code, ICD10_CODE_1);
        assertEq(record.recordType, RECORD_TYPE_DIAGNOSIS);
        assertFalse(record.isVerified);
    }

    function test_AddMedicalRecord_MultipleRecords() public {
        patientIdentity.mintIdentity(patient1);

        vm.prank(hospital1);
        patientIdentity.addMedicalRecord(patient1, IPFS_CID_1, DATA_HASH_1, ICD10_CODE_1, RECORD_TYPE_DIAGNOSIS);

        vm.prank(hospital2);
        patientIdentity.addMedicalRecord(patient1, IPFS_CID_2, DATA_HASH_2, ICD10_CODE_2, RECORD_TYPE_LAB);

        assertEq(patientIdentity.getRecordCount(patient1), 2);

        MedichainPatientIdentity.PatientProfile memory profile = patientIdentity.getPatientProfile(patient1);
        assertEq(profile.totalRecords, 2);
    }

    function test_AddMedicalRecord_NotWhitelistedHospital_Reverts() public {
        patientIdentity.mintIdentity(patient1);

        vm.prank(unauthorizedUser);
        vm.expectRevert(MedichainPatientIdentity.HospitalNotWhitelisted.selector);
        patientIdentity.addMedicalRecord(patient1, IPFS_CID_1, DATA_HASH_1, ICD10_CODE_1, RECORD_TYPE_DIAGNOSIS);
    }

    function test_AddMedicalRecord_PatientNotRegistered_Reverts() public {
        vm.prank(hospital1);
        vm.expectRevert(MedichainPatientIdentity.PatientNotRegistered.selector);
        patientIdentity.addMedicalRecord(patient1, IPFS_CID_1, DATA_HASH_1, ICD10_CODE_1, RECORD_TYPE_DIAGNOSIS);
    }

    function test_AddMedicalRecord_DuplicateHash_Reverts() public {
        patientIdentity.mintIdentity(patient1);

        vm.prank(hospital1);
        patientIdentity.addMedicalRecord(patient1, IPFS_CID_1, DATA_HASH_1, ICD10_CODE_1, RECORD_TYPE_DIAGNOSIS);

        vm.prank(hospital1);
        vm.expectRevert(MedichainPatientIdentity.DuplicateRecordHash.selector);
        patientIdentity.addMedicalRecord(patient1, IPFS_CID_2, DATA_HASH_1, ICD10_CODE_2, RECORD_TYPE_LAB);
    }

    function test_VerifyRecord_Success() public {
        patientIdentity.mintIdentity(patient1);

        vm.prank(hospital1);
        patientIdentity.addMedicalRecord(patient1, IPFS_CID_1, DATA_HASH_1, ICD10_CODE_1, RECORD_TYPE_DIAGNOSIS);

        vm.expectEmit(true, false, false, true);
        emit RecordVerified(patient1, 0, block.timestamp);
        patientIdentity.verifyRecord(patient1, 0);

        MedichainPatientIdentity.MedicalRecordRef memory record = 
            patientIdentity.getRecordByIndex(patient1, 0);
        assertTrue(record.isVerified);
    }

    function test_VerifyRecord_InvalidIndex_Reverts() public {
        patientIdentity.mintIdentity(patient1);

        vm.expectRevert(MedichainPatientIdentity.InvalidRecordIndex.selector);
        patientIdentity.verifyRecord(patient1, 0);
    }

    function test_VerifyRecord_NotAdmin_Reverts() public {
        patientIdentity.mintIdentity(patient1);

        vm.prank(hospital1);
        patientIdentity.addMedicalRecord(patient1, IPFS_CID_1, DATA_HASH_1, ICD10_CODE_1, RECORD_TYPE_DIAGNOSIS);

        vm.prank(hospital1);
        vm.expectRevert();
        patientIdentity.verifyRecord(patient1, 0);
    }

    function test_GetPatientRecords_ReturnsAllRecords() public {
        patientIdentity.mintIdentity(patient1);

        vm.prank(hospital1);
        patientIdentity.addMedicalRecord(patient1, IPFS_CID_1, DATA_HASH_1, ICD10_CODE_1, RECORD_TYPE_DIAGNOSIS);

        vm.prank(hospital2);
        patientIdentity.addMedicalRecord(patient1, IPFS_CID_2, DATA_HASH_2, ICD10_CODE_2, RECORD_TYPE_LAB);

        MedichainPatientIdentity.MedicalRecordRef[] memory records = 
            patientIdentity.getPatientRecords(patient1);

        assertEq(records.length, 2);
        assertEq(records[0].ipfsCid, IPFS_CID_1);
        assertEq(records[1].ipfsCid, IPFS_CID_2);
    }

    function test_GetRecordsByHospital_FiltersCorrectly() public {
        patientIdentity.mintIdentity(patient1);

        vm.prank(hospital1);
        patientIdentity.addMedicalRecord(patient1, IPFS_CID_1, DATA_HASH_1, ICD10_CODE_1, RECORD_TYPE_DIAGNOSIS);

        vm.prank(hospital2);
        patientIdentity.addMedicalRecord(patient1, IPFS_CID_2, DATA_HASH_2, ICD10_CODE_2, RECORD_TYPE_LAB);

        MedichainPatientIdentity.MedicalRecordRef[] memory hospital1Records = 
            patientIdentity.getRecordsByHospital(patient1, hospital1);

        assertEq(hospital1Records.length, 1);
        assertEq(hospital1Records[0].hospitalAddress, hospital1);
    }

    function test_GetRecordByIndex_InvalidIndex_Reverts() public {
        patientIdentity.mintIdentity(patient1);

        vm.expectRevert(MedichainPatientIdentity.InvalidRecordIndex.selector);
        patientIdentity.getRecordByIndex(patient1, 99);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // HOSPITAL WHITELIST TESTS
    // ═══════════════════════════════════════════════════════════════════════════

    function test_WhitelistHospital_Success() public {
        address newHospital = vm.addr(0xB1);

        vm.expectEmit(true, false, false, true);
        emit HospitalWhitelisted(newHospital, "RS Baru");
        patientIdentity.whitelistHospital(newHospital, "RS Baru");

        assertTrue(patientIdentity.isWhitelistedHospital(newHospital));
        assertTrue(patientIdentity.hasRole(patientIdentity.HOSPITAL_ROLE(), newHospital));
    }

    function test_WhitelistHospital_ZeroAddress_Reverts() public {
        vm.expectRevert(MedichainPatientIdentity.ZeroAddressNotAllowed.selector);
        patientIdentity.whitelistHospital(address(0), "Invalid Hospital");
    }

    function test_WhitelistHospital_NotAdmin_Reverts() public {
        vm.prank(unauthorizedUser);
        vm.expectRevert();
        patientIdentity.whitelistHospital(vm.addr(0xC1), "Unauthorized Hospital");
    }

    function test_RemoveHospitalFromWhitelist_Success() public {
        vm.expectEmit(true, false, false, false);
        emit HospitalRemovedFromWhitelist(hospital1);
        patientIdentity.removeHospitalFromWhitelist(hospital1);

        assertFalse(patientIdentity.isWhitelistedHospital(hospital1));
        assertFalse(patientIdentity.hasRole(patientIdentity.HOSPITAL_ROLE(), hospital1));
    }

    function test_RemoveHospitalFromWhitelist_CantAddRecordsAnymore() public {
        patientIdentity.mintIdentity(patient1);
        patientIdentity.removeHospitalFromWhitelist(hospital1);

        vm.prank(hospital1);
        vm.expectRevert(MedichainPatientIdentity.HospitalNotWhitelisted.selector);
        patientIdentity.addMedicalRecord(patient1, IPFS_CID_1, DATA_HASH_1, ICD10_CODE_1, RECORD_TYPE_DIAGNOSIS);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // SIGNATURE VERIFICATION TESTS
    // ═══════════════════════════════════════════════════════════════════════════

    function test_VerifyPatientSignature_ValidSignature() public {
        patientIdentity.mintIdentity(patient1);

        bytes32 messageHash = keccak256("test_message");
        bytes32 ethSignedMessageHash = keccak256(
            abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash)
        );

        (uint8 v, bytes32 r, bytes32 s) = vm.sign(patient1PrivateKey, ethSignedMessageHash);
        bytes memory signature = abi.encodePacked(r, s, v);

        bool isValid = patientIdentity.verifyPatientSignature(patient1, messageHash, signature);
        assertTrue(isValid);
    }

    function test_VerifyPatientSignature_InvalidSignature() public {
        patientIdentity.mintIdentity(patient1);

        bytes32 messageHash = keccak256("test_message");
        bytes32 ethSignedMessageHash = keccak256(
            abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash)
        );

        // Sign with wrong key (patient2's key)
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(patient2PrivateKey, ethSignedMessageHash);
        bytes memory signature = abi.encodePacked(r, s, v);

        bool isValid = patientIdentity.verifyPatientSignature(patient1, messageHash, signature);
        assertFalse(isValid);
    }

    function test_VerifyPatientSignature_UnregisteredPatient() public {
        bytes32 messageHash = keccak256("test_message");
        bytes32 ethSignedMessageHash = keccak256(
            abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash)
        );

        (uint8 v, bytes32 r, bytes32 s) = vm.sign(patient1PrivateKey, ethSignedMessageHash);
        bytes memory signature = abi.encodePacked(r, s, v);

        // Patient1 is not registered, should return false
        bool isValid = patientIdentity.verifyPatientSignature(patient1, messageHash, signature);
        assertFalse(isValid);
    }

    function test_GetAccessGrantMessageHash_Consistency() public view {
        bytes32 hash1 = patientIdentity.getAccessGrantMessageHash(
            patient1,
            hospital1,
            ACCESS_TYPE_FULL,
            block.timestamp + 1 days,
            1
        );

        bytes32 hash2 = patientIdentity.getAccessGrantMessageHash(
            patient1,
            hospital1,
            ACCESS_TYPE_FULL,
            block.timestamp + 1 days,
            1
        );

        assertEq(hash1, hash2);
    }

    function test_GetAccessGrantMessageHash_DifferentNonceProducesDifferentHash() public view {
        bytes32 hash1 = patientIdentity.getAccessGrantMessageHash(
            patient1,
            hospital1,
            ACCESS_TYPE_FULL,
            block.timestamp + 1 days,
            1
        );

        bytes32 hash2 = patientIdentity.getAccessGrantMessageHash(
            patient1,
            hospital1,
            ACCESS_TYPE_FULL,
            block.timestamp + 1 days,
            2
        );

        assertTrue(hash1 != hash2);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // VIEW FUNCTION TESTS
    // ═══════════════════════════════════════════════════════════════════════════

    function test_GetPatientId_ReturnsCorrectId() public {
        patientIdentity.mintIdentity(patient1);
        assertEq(patientIdentity.getPatientId(patient1), 1);
    }

    function test_GetPatientId_UnregisteredReturnsZero() public view {
        assertEq(patientIdentity.getPatientId(patient1), 0);
    }

    function test_HasPatientIdentity_RegisteredReturnsTrue() public {
        patientIdentity.mintIdentity(patient1);
        assertTrue(patientIdentity.hasPatientIdentity(patient1));
    }

    function test_HasPatientIdentity_UnregisteredReturnsFalse() public view {
        assertFalse(patientIdentity.hasPatientIdentity(patient1));
    }

    function test_SupportsInterface_ERC721() public view {
        // ERC721 interface ID
        bytes4 erc721InterfaceId = 0x80ac58cd;
        assertTrue(patientIdentity.supportsInterface(erc721InterfaceId));
    }

    function test_SupportsInterface_AccessControl() public view {
        // AccessControl interface ID
        bytes4 accessControlInterfaceId = 0x7965db0b;
        assertTrue(patientIdentity.supportsInterface(accessControlInterfaceId));
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // INTEGRATION / FLOW TESTS
    // ═══════════════════════════════════════════════════════════════════════════

    function test_FullPatientFlow() public {
        // 1. Hospital onboards patient
        vm.prank(hospital1);
        uint256 patientId = patientIdentity.mintIdentity(patient1);
        assertEq(patientId, 1);

        // 2. Hospital adds medical record
        vm.prank(hospital1);
        uint256 recordIdx = patientIdentity.addMedicalRecord(
            patient1,
            IPFS_CID_1,
            DATA_HASH_1,
            ICD10_CODE_1,
            RECORD_TYPE_DIAGNOSIS
        );
        assertEq(recordIdx, 0);

        // 3. Admin verifies the record
        patientIdentity.verifyRecord(patient1, 0);

        // 4. Patient grants access to hospital2
        vm.prank(patient1);
        patientIdentity.grantAccess(hospital2, ACCESS_TYPE_FULL, 0);

        // 5. Hospital2 can verify they have access
        (bool hasAccess,) = patientIdentity.checkAccess(patient1, hospital2);
        assertTrue(hasAccess);

        // 6. Hospital2 adds another record
        vm.prank(hospital2);
        patientIdentity.addMedicalRecord(
            patient1,
            IPFS_CID_2,
            DATA_HASH_2,
            ICD10_CODE_2,
            RECORD_TYPE_LAB
        );

        // 7. Verify final state
        assertEq(patientIdentity.getRecordCount(patient1), 2);
        MedichainPatientIdentity.PatientProfile memory profile = patientIdentity.getPatientProfile(patient1);
        assertEq(profile.totalRecords, 2);

        // 8. Patient revokes access from hospital2
        vm.prank(patient1);
        patientIdentity.revokeAccess(hospital2);

        (hasAccess,) = patientIdentity.checkAccess(patient1, hospital2);
        assertFalse(hasAccess);
    }

    function test_MultiplePatients_IsolatedData() public {
        // Register both patients
        patientIdentity.mintIdentity(patient1);
        patientIdentity.mintIdentity(patient2);

        // Add record to patient1
        vm.prank(hospital1);
        patientIdentity.addMedicalRecord(patient1, IPFS_CID_1, DATA_HASH_1, ICD10_CODE_1, RECORD_TYPE_DIAGNOSIS);

        // Verify patient2 has no records
        assertEq(patientIdentity.getRecordCount(patient1), 1);
        assertEq(patientIdentity.getRecordCount(patient2), 0);

        // Grant access for patient1 doesn't affect patient2
        vm.prank(patient1);
        patientIdentity.grantAccess(hospital2, ACCESS_TYPE_FULL, 0);

        (bool hasAccessToPatient1,) = patientIdentity.checkAccess(patient1, hospital2);
        (bool hasAccessToPatient2,) = patientIdentity.checkAccess(patient2, hospital2);

        assertTrue(hasAccessToPatient1);
        assertFalse(hasAccessToPatient2);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // FUZZ TESTS
    // ═══════════════════════════════════════════════════════════════════════════

    function testFuzz_MintIdentity_UniqueIds(uint8 numPatients) public {
        vm.assume(numPatients > 0 && numPatients <= 50);

        for (uint8 i = 0; i < numPatients; i++) {
            address newPatient = vm.addr(uint256(i) + 1000);
            uint256 patientId = patientIdentity.mintIdentity(newPatient);
            assertEq(patientId, i + 1);
        }

        assertEq(patientIdentity.getTotalPatients(), numPatients);
    }

    function testFuzz_AccessExpiry(uint256 expiryOffset) public {
        vm.assume(expiryOffset > 0 && expiryOffset < 365 days);

        patientIdentity.mintIdentity(patient1);
        uint256 expiryTime = block.timestamp + expiryOffset;

        vm.prank(patient1);
        patientIdentity.grantAccess(hospital1, ACCESS_TYPE_FULL, expiryTime);

        // Before expiry
        (bool hasAccess,) = patientIdentity.checkAccess(patient1, hospital1);
        assertTrue(hasAccess);

        // After expiry
        vm.warp(expiryTime + 1);
        (hasAccess,) = patientIdentity.checkAccess(patient1, hospital1);
        assertFalse(hasAccess);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // HOSPITAL REGISTRY INTEGRATION TESTS
    // ═══════════════════════════════════════════════════════════════════════════

    function test_SetHospitalRegistry_Success() public {
        address mockRegistry = vm.addr(0xEE61);
        
        patientIdentity.setHospitalRegistry(mockRegistry);
        
        assertEq(address(patientIdentity.hospitalRegistry()), mockRegistry);
    }

    function test_SetHospitalRegistry_OnlyAdmin() public {
        address mockRegistry = vm.addr(0xEE61);
        
        vm.prank(unauthorizedUser);
        vm.expectRevert();
        patientIdentity.setHospitalRegistry(mockRegistry);
    }

    function test_IsHospitalAuthorized_LocalWhitelist() public view {
        // hospital1 was whitelisted in setUp
        assertTrue(patientIdentity.isHospitalAuthorized(hospital1));
        assertTrue(patientIdentity.isHospitalAuthorized(hospital2));
        assertFalse(patientIdentity.isHospitalAuthorized(unauthorizedUser));
    }

    function test_Constructor_WithHospitalRegistry() public {
        // Deploy with a mock registry address
        address mockRegistry = vm.addr(0xEE62);
        MedichainPatientIdentity newIdentity = new MedichainPatientIdentity(mockRegistry, address(forwarder));
        
        assertEq(address(newIdentity.hospitalRegistry()), mockRegistry);
    }

    function test_Constructor_WithoutHospitalRegistry() public {
        MedichainPatientIdentity newIdentity = new MedichainPatientIdentity(address(0), address(forwarder));
        
        assertEq(address(newIdentity.hospitalRegistry()), address(0));
    }
}
