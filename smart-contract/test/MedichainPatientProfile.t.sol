// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/MedichainPatientProfile.sol";
import "../src/interfaces/IPatientIdentity.sol";

/**
 * @title MockPatientIdentity
 * @notice Mock contract for testing MedichainPatientProfile
 */
contract MockPatientIdentity is IPatientIdentity {
    mapping(address => bool) public registeredPatients;
    mapping(address => mapping(address => AccessPermission)) public permissions;

    function setPatientRegistered(address patient, bool registered) external {
        registeredPatients[patient] = registered;
    }

    function setAccess(
        address patient, 
        address accessor, 
        bool granted,
        uint256 expiresAt,
        string memory accessType
    ) external {
        permissions[patient][accessor] = AccessPermission({
            isGranted: granted,
            expiresAt: expiresAt,
            grantedAt: block.timestamp,
            accessType: accessType
        });
    }

    function hasPatientIdentity(address patient) external view override returns (bool) {
        return registeredPatients[patient];
    }

    function checkAccess(
        address patient, 
        address accessor
    ) external view override returns (bool hasAccess, AccessPermission memory permission) {
        permission = permissions[patient][accessor];
        hasAccess = permission.isGranted && 
                   (permission.expiresAt == 0 || permission.expiresAt > block.timestamp);
        return (hasAccess, permission);
    }
}

/**
 * @title MockForwarder
 * @notice Simple mock forwarder for testing ERC2771
 */
contract MockForwarder {
    // Simple implementation, just for constructor
}

/**
 * @title MedichainPatientProfileTest
 * @notice Comprehensive tests for MedichainPatientProfile contract
 */
contract MedichainPatientProfileTest is Test {
    MedichainPatientProfile public profileContract;
    MockPatientIdentity public mockIdentity;
    MockForwarder public mockForwarder;

    address public patient1 = address(0x1111);
    address public patient2 = address(0x2222);
    address public hospital1 = address(0x3333);
    address public hospital2 = address(0x4444);
    address public unauthorized = address(0x5555);

    bytes public sampleEncryptedData = hex"a1b2c3d4e5f6";
    bytes public updatedEncryptedData = hex"f6e5d4c3b2a1";

    // Events for testing
    event ProfileCreated(address indexed patient, uint256 dataLength, uint256 timestamp);
    event ProfileUpdated(address indexed patient, uint256 dataLength, uint256 timestamp);
    event ProfileDeleted(address indexed patient, uint256 timestamp);
    event ProfileAccessed(address indexed patient, address indexed accessor, string accessType, uint256 timestamp);

    function setUp() public {
        // Deploy mock contracts
        mockIdentity = new MockPatientIdentity();
        mockForwarder = new MockForwarder();

        // Deploy profile contract
        profileContract = new MedichainPatientProfile(
            address(mockIdentity),
            address(mockForwarder)
        );

        // Register patients
        mockIdentity.setPatientRegistered(patient1, true);
        mockIdentity.setPatientRegistered(patient2, true);

        // Grant hospital1 access to patient1
        mockIdentity.setAccess(patient1, hospital1, true, 0, "FULL"); // No expiry
        
        // Grant hospital2 access to patient1 with expiry
        mockIdentity.setAccess(patient1, hospital2, true, block.timestamp + 1 days, "TEMPORARY");
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // CONSTRUCTOR TESTS
    // ═══════════════════════════════════════════════════════════════════════════

    function test_Constructor_SetsPatientIdentityContract() public view {
        assertEq(
            address(profileContract.patientIdentityContract()),
            address(mockIdentity)
        );
    }

    function test_Constructor_RevertsOnZeroAddress() public {
        vm.expectRevert(MedichainPatientProfile.InvalidPatientIdentityContract.selector);
        new MedichainPatientProfile(address(0), address(mockForwarder));
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // SET PROFILE TESTS
    // ═══════════════════════════════════════════════════════════════════════════

    function test_SetProfile_Success() public {
        vm.prank(patient1);
        vm.expectEmit(true, false, false, true);
        emit ProfileCreated(patient1, sampleEncryptedData.length, block.timestamp);
        
        profileContract.setProfile(sampleEncryptedData);

        assertTrue(profileContract.hasProfile(patient1));
    }

    function test_SetProfile_StoresCorrectMetadata() public {
        vm.prank(patient1);
        profileContract.setProfile(sampleEncryptedData);

        (bool exists, uint256 createdAt, uint256 updatedAt, uint256 dataLength) = 
            profileContract.getProfileMetadata(patient1);

        assertTrue(exists);
        assertEq(createdAt, block.timestamp);
        assertEq(updatedAt, block.timestamp);
        assertEq(dataLength, sampleEncryptedData.length);
    }

    function test_SetProfile_RevertsIfNotRegistered() public {
        vm.prank(unauthorized);
        vm.expectRevert(MedichainPatientProfile.PatientNotRegistered.selector);
        profileContract.setProfile(sampleEncryptedData);
    }

    function test_SetProfile_RevertsIfProfileExists() public {
        vm.prank(patient1);
        profileContract.setProfile(sampleEncryptedData);

        vm.prank(patient1);
        vm.expectRevert(MedichainPatientProfile.ProfileAlreadyExists.selector);
        profileContract.setProfile(sampleEncryptedData);
    }

    function test_SetProfile_RevertsOnEmptyData() public {
        vm.prank(patient1);
        vm.expectRevert(MedichainPatientProfile.EmptyProfileData.selector);
        profileContract.setProfile("");
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // UPDATE PROFILE TESTS
    // ═══════════════════════════════════════════════════════════════════════════

    function test_UpdateProfile_Success() public {
        // First create profile
        vm.prank(patient1);
        profileContract.setProfile(sampleEncryptedData);

        // Advance time
        vm.warp(block.timestamp + 1 hours);

        // Update
        vm.prank(patient1);
        vm.expectEmit(true, false, false, true);
        emit ProfileUpdated(patient1, updatedEncryptedData.length, block.timestamp);
        
        profileContract.updateProfile(updatedEncryptedData);
    }

    function test_UpdateProfile_UpdatesMetadata() public {
        vm.prank(patient1);
        profileContract.setProfile(sampleEncryptedData);

        // Profile was created at timestamp 1 (Foundry default)
        // Now advance time
        vm.warp(block.timestamp + 1 hours);

        vm.prank(patient1);
        profileContract.updateProfile(updatedEncryptedData);

        (bool exists, uint256 createdAt, uint256 updatedAt, uint256 dataLength) = 
            profileContract.getProfileMetadata(patient1);

        assertTrue(exists);
        assertEq(createdAt, 1); // Created at Foundry default timestamp
        assertEq(updatedAt, 3601); // Updated after 1 hour warp (1 + 3600)
        assertEq(dataLength, updatedEncryptedData.length);
    }

    function test_UpdateProfile_RevertsIfNoProfile() public {
        vm.prank(patient1);
        vm.expectRevert(MedichainPatientProfile.ProfileNotFound.selector);
        profileContract.updateProfile(updatedEncryptedData);
    }

    function test_UpdateProfile_RevertsOnEmptyData() public {
        vm.prank(patient1);
        profileContract.setProfile(sampleEncryptedData);

        vm.prank(patient1);
        vm.expectRevert(MedichainPatientProfile.EmptyProfileData.selector);
        profileContract.updateProfile("");
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // DELETE PROFILE TESTS
    // ═══════════════════════════════════════════════════════════════════════════

    function test_DeleteProfile_Success() public {
        vm.prank(patient1);
        profileContract.setProfile(sampleEncryptedData);

        vm.prank(patient1);
        vm.expectEmit(true, false, false, true);
        emit ProfileDeleted(patient1, block.timestamp);
        
        profileContract.deleteProfile();

        assertFalse(profileContract.hasProfile(patient1));
    }

    function test_DeleteProfile_RevertsIfNoProfile() public {
        vm.prank(patient1);
        vm.expectRevert(MedichainPatientProfile.ProfileNotFound.selector);
        profileContract.deleteProfile();
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // GET PROFILE TESTS
    // ═══════════════════════════════════════════════════════════════════════════

    function test_GetProfile_PatientCanAccessOwn() public {
        vm.prank(patient1);
        profileContract.setProfile(sampleEncryptedData);

        vm.prank(patient1);
        bytes memory data = profileContract.getProfile(patient1);

        assertEq(data, sampleEncryptedData);
    }

    function test_GetProfile_AuthorizedHospitalCanAccess() public {
        vm.prank(patient1);
        profileContract.setProfile(sampleEncryptedData);

        vm.prank(hospital1);
        bytes memory data = profileContract.getProfile(patient1);

        assertEq(data, sampleEncryptedData);
    }

    function test_GetProfile_RevertsForUnauthorized() public {
        vm.prank(patient1);
        profileContract.setProfile(sampleEncryptedData);

        vm.prank(unauthorized);
        vm.expectRevert(MedichainPatientProfile.NotAuthorizedToAccess.selector);
        profileContract.getProfile(patient1);
    }

    function test_GetProfile_RevertsForExpiredAccess() public {
        vm.prank(patient1);
        profileContract.setProfile(sampleEncryptedData);

        // Warp past expiry time
        vm.warp(block.timestamp + 2 days);

        vm.prank(hospital2);
        vm.expectRevert(MedichainPatientProfile.NotAuthorizedToAccess.selector);
        profileContract.getProfile(patient1);
    }

    function test_GetProfile_LogsAccess() public {
        vm.prank(patient1);
        profileContract.setProfile(sampleEncryptedData);

        vm.prank(hospital1);
        vm.expectEmit(true, true, false, true);
        emit ProfileAccessed(patient1, hospital1, "READ", block.timestamp);
        
        profileContract.getProfile(patient1);

        assertEq(profileContract.accessCount(patient1), 1);
    }

    function test_GetProfile_SelfAccessLoggedAsSelf() public {
        vm.prank(patient1);
        profileContract.setProfile(sampleEncryptedData);

        vm.prank(patient1);
        vm.expectEmit(true, true, false, true);
        emit ProfileAccessed(patient1, patient1, "SELF", block.timestamp);
        
        profileContract.getProfile(patient1);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // GET PROFILE VIEW TESTS
    // ═══════════════════════════════════════════════════════════════════════════

    function test_GetProfileView_DoesNotLog() public {
        vm.prank(patient1);
        profileContract.setProfile(sampleEncryptedData);

        uint256 countBefore = profileContract.accessCount(patient1);

        vm.prank(hospital1);
        profileContract.getProfileView(patient1);

        uint256 countAfter = profileContract.accessCount(patient1);
        assertEq(countBefore, countAfter);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // ACCESS HISTORY TESTS
    // ═══════════════════════════════════════════════════════════════════════════

    function test_GetAccessHistory_ReturnsCorrectLogs() public {
        vm.prank(patient1);
        profileContract.setProfile(sampleEncryptedData);

        // Multiple accesses
        vm.prank(patient1);
        profileContract.getProfile(patient1);

        vm.warp(block.timestamp + 1 hours);

        vm.prank(hospital1);
        profileContract.getProfile(patient1);

        vm.warp(block.timestamp + 1 hours);

        vm.prank(hospital1);
        profileContract.getProfile(patient1);

        // Check history
        vm.prank(patient1);
        MedichainPatientProfile.AccessLog[] memory logs = profileContract.getAccessHistory();

        assertEq(logs.length, 3);
        assertEq(logs[0].accessor, patient1);
        assertEq(logs[1].accessor, hospital1);
        assertEq(logs[2].accessor, hospital1);
    }

    function test_GetRecentAccessLogs_ReturnsPaginatedLogs() public {
        vm.prank(patient1);
        profileContract.setProfile(sampleEncryptedData);

        // Create 5 access logs
        for (uint256 i = 0; i < 5; i++) {
            vm.warp(block.timestamp + 1 hours);
            vm.prank(hospital1);
            profileContract.getProfile(patient1);
        }

        // Get last 3
        vm.prank(patient1);
        MedichainPatientProfile.AccessLog[] memory logs = 
            profileContract.getRecentAccessLogs(patient1, 3);

        assertEq(logs.length, 3);
    }

    function test_GetRecentAccessLogs_RevertsForNonPatient() public {
        vm.prank(patient1);
        profileContract.setProfile(sampleEncryptedData);

        vm.prank(hospital1);
        vm.expectRevert(MedichainPatientProfile.NotPatientOwner.selector);
        profileContract.getRecentAccessLogs(patient1, 3);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // HAS PROFILE TESTS
    // ═══════════════════════════════════════════════════════════════════════════

    function test_HasProfile_ReturnsFalseIfNotSet() public view {
        assertFalse(profileContract.hasProfile(patient1));
    }

    function test_HasProfile_ReturnsTrueIfSet() public {
        vm.prank(patient1);
        profileContract.setProfile(sampleEncryptedData);

        assertTrue(profileContract.hasProfile(patient1));
    }

    function test_HasProfile_ReturnsFalseAfterDelete() public {
        vm.prank(patient1);
        profileContract.setProfile(sampleEncryptedData);

        vm.prank(patient1);
        profileContract.deleteProfile();

        assertFalse(profileContract.hasProfile(patient1));
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // INTEGRATION TESTS
    // ═══════════════════════════════════════════════════════════════════════════

    function test_FullLifecycle() public {
        // 1. Patient creates profile
        vm.prank(patient1);
        profileContract.setProfile(sampleEncryptedData);
        assertTrue(profileContract.hasProfile(patient1));

        // 2. Patient reads own profile
        vm.prank(patient1);
        bytes memory data1 = profileContract.getProfile(patient1);
        assertEq(data1, sampleEncryptedData);

        // 3. Hospital reads profile
        vm.prank(hospital1);
        bytes memory data2 = profileContract.getProfile(patient1);
        assertEq(data2, sampleEncryptedData);

        // 4. Patient updates profile
        vm.prank(patient1);
        profileContract.updateProfile(updatedEncryptedData);

        // 5. Verify update
        vm.prank(patient1);
        bytes memory data3 = profileContract.getProfile(patient1);
        assertEq(data3, updatedEncryptedData);

        // 6. Check access count (3 reads: patient, hospital, patient)
        assertEq(profileContract.accessCount(patient1), 3);

        // 7. Patient deletes profile
        vm.prank(patient1);
        profileContract.deleteProfile();
        assertFalse(profileContract.hasProfile(patient1));
    }

    function test_MultiplePatients() public {
        // Patient1 creates profile
        vm.prank(patient1);
        profileContract.setProfile(sampleEncryptedData);

        // Patient2 creates different profile
        vm.prank(patient2);
        profileContract.setProfile(updatedEncryptedData);

        // Both profiles exist independently
        assertTrue(profileContract.hasProfile(patient1));
        assertTrue(profileContract.hasProfile(patient2));

        // Data is different
        vm.prank(patient1);
        bytes memory data1 = profileContract.getProfile(patient1);

        vm.prank(patient2);
        bytes memory data2 = profileContract.getProfile(patient2);

        assertEq(data1, sampleEncryptedData);
        assertEq(data2, updatedEncryptedData);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // FUZZ TESTS
    // ═══════════════════════════════════════════════════════════════════════════

    function testFuzz_SetProfile_VariableDataLength(bytes calldata data) public {
        vm.assume(data.length > 0);
        vm.assume(data.length < 100000); // Reasonable limit

        mockIdentity.setPatientRegistered(address(this), true);
        profileContract.setProfile(data);

        (, , , uint256 storedLength) = profileContract.getProfileMetadata(address(this));
        assertEq(storedLength, data.length);
    }

    function testFuzz_AccessCount_AlwaysIncrements(uint8 accessCount_) public {
        vm.assume(accessCount_ > 0);
        vm.assume(accessCount_ < 50); // Reasonable limit

        vm.prank(patient1);
        profileContract.setProfile(sampleEncryptedData);

        for (uint256 i = 0; i < accessCount_; i++) {
            vm.prank(hospital1);
            profileContract.getProfile(patient1);
        }

        assertEq(profileContract.accessCount(patient1), accessCount_);
    }
}
