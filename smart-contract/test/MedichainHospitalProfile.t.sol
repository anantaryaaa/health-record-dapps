// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/MedichainHospitalProfile.sol";
import "../src/interfaces/IHospitalRegistryExtended.sol";

/**
 * @title MockHospitalRegistry
 * @notice Mock contract for testing MedichainHospitalProfile
 */
contract MockHospitalRegistry is IHospitalRegistryExtended {
    struct MockHospital {
        string name;
        string licenseNumber;
        address wallet;
        bool isVerified;
    }

    mapping(address => MockHospital) public hospitals;

    function setHospital(
        address wallet,
        string memory name,
        string memory licenseNumber,
        bool isVerified
    ) external {
        hospitals[wallet] = MockHospital({
            name: name,
            licenseNumber: licenseNumber,
            wallet: wallet,
            isVerified: isVerified
        });
    }

    function isHospitalVerified(address hospital) external view override returns (bool) {
        return hospitals[hospital].isVerified;
    }

    function getHospitalDetails(address hospital) external view override returns (
        string memory name,
        string memory licenseNumber,
        address wallet,
        bool isVerified
    ) {
        MockHospital memory h = hospitals[hospital];
        return (h.name, h.licenseNumber, h.wallet, h.isVerified);
    }
}

/**
 * @title MockForwarder
 * @notice Simple mock forwarder for testing ERC2771
 */
contract MockForwarder {}

/**
 * @title MedichainHospitalProfileTest
 * @notice Comprehensive tests for MedichainHospitalProfile contract
 */
contract MedichainHospitalProfileTest is Test {
    MedichainHospitalProfile public profileContract;
    MockHospitalRegistry public mockRegistry;
    MockForwarder public mockForwarder;

    address public hospital1 = address(0x1111);
    address public hospital2 = address(0x2222);
    address public hospital3 = address(0x3333);
    address public unverifiedHospital = address(0x4444);
    address public patient = address(0x5555);

    // Events for testing
    event ProfileCreated(address indexed hospital, string name, string hospitalType, string city, uint256 timestamp);
    event ProfileUpdated(address indexed hospital, uint256 timestamp);
    event ProfileDeactivated(address indexed hospital, uint256 timestamp);
    event ProfileReactivated(address indexed hospital, uint256 timestamp);

    function setUp() public {
        // Deploy mock contracts
        mockRegistry = new MockHospitalRegistry();
        mockForwarder = new MockForwarder();

        // Deploy profile contract
        profileContract = new MedichainHospitalProfile(
            address(mockRegistry),
            address(mockForwarder)
        );

        // Setup verified hospitals
        mockRegistry.setHospital(hospital1, "RS Medichain Jakarta", "RS-001-JKT", true);
        mockRegistry.setHospital(hospital2, "Klinik Sehat Bandung", "KL-002-BDG", true);
        mockRegistry.setHospital(hospital3, "Lab Diagnostic Jakarta", "LB-003-JKT", true);
        
        // Unverified hospital
        mockRegistry.setHospital(unverifiedHospital, "RS Belum Verified", "RS-999", false);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // CONSTRUCTOR TESTS
    // ═══════════════════════════════════════════════════════════════════════════

    function test_Constructor_SetsHospitalRegistry() public view {
        assertEq(address(profileContract.hospitalRegistry()), address(mockRegistry));
    }

    function test_Constructor_RevertsOnZeroAddress() public {
        vm.expectRevert(MedichainHospitalProfile.InvalidRegistryAddress.selector);
        new MedichainHospitalProfile(address(0), address(mockForwarder));
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // SET PROFILE TESTS
    // ═══════════════════════════════════════════════════════════════════════════

    function test_SetProfile_Success() public {
        vm.prank(hospital1);
        vm.expectEmit(true, false, false, true);
        emit ProfileCreated(hospital1, "RS Medichain Jakarta", "general", "Jakarta", block.timestamp);
        
        profileContract.setProfile(
            "general",
            "Jl. Sudirman No. 123",
            "Jakarta",
            "+62211234567",
            "Dr. Budi",
            "Medical Director",
            "+628123456789",
            "budi@medichain.com"
        );

        assertTrue(profileContract.hasProfile(hospital1));
    }

    function test_SetProfile_StoresCorrectData() public {
        vm.prank(hospital1);
        profileContract.setProfile(
            "general",
            "Jl. Sudirman No. 123",
            "Jakarta",
            "+62211234567",
            "Dr. Budi",
            "Medical Director",
            "+628123456789",
            "budi@medichain.com"
        );

        MedichainHospitalProfile.HospitalProfile memory profile = 
            profileContract.getProfile(hospital1);

        assertEq(profile.name, "RS Medichain Jakarta");
        assertEq(profile.hospitalType, "general");
        assertEq(profile.licenseNumber, "RS-001-JKT");
        assertEq(profile.physicalAddress, "Jl. Sudirman No. 123");
        assertEq(profile.city, "Jakarta");
        assertEq(profile.phone, "+62211234567");
        assertEq(profile.picName, "Dr. Budi");
        assertEq(profile.picPosition, "Medical Director");
        assertEq(profile.picPhone, "+628123456789");
        assertEq(profile.picEmail, "budi@medichain.com");
        assertTrue(profile.isActive);
    }

    function test_SetProfile_RevertsIfNotVerified() public {
        vm.prank(unverifiedHospital);
        vm.expectRevert(MedichainHospitalProfile.HospitalNotVerified.selector);
        profileContract.setProfile(
            "general", "Address", "City", "Phone",
            "PIC", "Position", "PICPhone", "email@test.com"
        );
    }

    function test_SetProfile_RevertsIfProfileExists() public {
        vm.prank(hospital1);
        profileContract.setProfile(
            "general", "Address", "Jakarta", "Phone",
            "PIC", "Position", "PICPhone", "email@test.com"
        );

        vm.prank(hospital1);
        vm.expectRevert(MedichainHospitalProfile.ProfileAlreadyExists.selector);
        profileContract.setProfile(
            "clinic", "New Address", "Bandung", "NewPhone",
            "NewPIC", "NewPosition", "NewPICPhone", "new@test.com"
        );
    }

    function test_SetProfile_RevertsOnInvalidType() public {
        vm.prank(hospital1);
        vm.expectRevert(MedichainHospitalProfile.InvalidHospitalType.selector);
        profileContract.setProfile(
            "invalid_type", "Address", "City", "Phone",
            "PIC", "Position", "PICPhone", "email@test.com"
        );
    }

    function test_SetProfile_RevertsOnEmptyAddress() public {
        vm.prank(hospital1);
        vm.expectRevert(MedichainHospitalProfile.EmptyRequiredField.selector);
        profileContract.setProfile(
            "general", "", "City", "Phone",
            "PIC", "Position", "PICPhone", "email@test.com"
        );
    }

    function test_SetProfile_RevertsOnEmptyCity() public {
        vm.prank(hospital1);
        vm.expectRevert(MedichainHospitalProfile.EmptyRequiredField.selector);
        profileContract.setProfile(
            "general", "Address", "", "Phone",
            "PIC", "Position", "PICPhone", "email@test.com"
        );
    }

    function test_SetProfile_RevertsOnEmptyPhone() public {
        vm.prank(hospital1);
        vm.expectRevert(MedichainHospitalProfile.EmptyRequiredField.selector);
        profileContract.setProfile(
            "general", "Address", "City", "",
            "PIC", "Position", "PICPhone", "email@test.com"
        );
    }

    function test_SetProfile_AllValidTypes() public {
        // Test all valid types
        string[4] memory types = ["general", "clinic", "laboratory", "specialist"];
        address[4] memory hospitals = [hospital1, hospital2, hospital3, address(0x6666)];
        
        // Register the 4th hospital
        mockRegistry.setHospital(hospitals[3], "RS Specialist", "RS-004", true);

        for (uint i = 0; i < types.length; i++) {
            vm.prank(hospitals[i]);
            profileContract.setProfile(
                types[i], "Address", "City", "Phone",
                "PIC", "Position", "PICPhone", "email@test.com"
            );
            assertTrue(profileContract.hasProfile(hospitals[i]));
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // UPDATE PROFILE TESTS
    // ═══════════════════════════════════════════════════════════════════════════

    function test_UpdateProfile_Success() public {
        // First create profile
        vm.prank(hospital1);
        profileContract.setProfile(
            "general", "Old Address", "Jakarta", "OldPhone",
            "OldPIC", "OldPosition", "OldPICPhone", "old@test.com"
        );

        vm.warp(block.timestamp + 1 hours);

        // Update
        vm.prank(hospital1);
        vm.expectEmit(true, false, false, true);
        emit ProfileUpdated(hospital1, block.timestamp);
        
        profileContract.updateProfile(
            "clinic", "New Address", "Bandung", "NewPhone",
            "NewPIC", "NewPosition", "NewPICPhone", "new@test.com"
        );

        MedichainHospitalProfile.HospitalProfile memory profile = 
            profileContract.getProfile(hospital1);

        assertEq(profile.hospitalType, "clinic");
        assertEq(profile.physicalAddress, "New Address");
        assertEq(profile.city, "Bandung");
    }

    function test_UpdateProfile_RevertsIfNoProfile() public {
        vm.prank(hospital1);
        vm.expectRevert(MedichainHospitalProfile.ProfileNotFound.selector);
        profileContract.updateProfile(
            "general", "Address", "City", "Phone",
            "PIC", "Position", "PICPhone", "email@test.com"
        );
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // DEACTIVATE/REACTIVATE TESTS
    // ═══════════════════════════════════════════════════════════════════════════

    function test_DeactivateProfile_Success() public {
        vm.prank(hospital1);
        profileContract.setProfile(
            "general", "Address", "Jakarta", "Phone",
            "PIC", "Position", "PICPhone", "email@test.com"
        );

        vm.prank(hospital1);
        vm.expectEmit(true, false, false, true);
        emit ProfileDeactivated(hospital1, block.timestamp);
        
        profileContract.deactivateProfile();

        assertFalse(profileContract.isHospitalActive(hospital1));
    }

    function test_DeactivateProfile_RevertsIfAlreadyInactive() public {
        vm.prank(hospital1);
        profileContract.setProfile(
            "general", "Address", "Jakarta", "Phone",
            "PIC", "Position", "PICPhone", "email@test.com"
        );

        vm.prank(hospital1);
        profileContract.deactivateProfile();

        vm.prank(hospital1);
        vm.expectRevert(MedichainHospitalProfile.ProfileNotActive.selector);
        profileContract.deactivateProfile();
    }

    function test_ReactivateProfile_Success() public {
        vm.prank(hospital1);
        profileContract.setProfile(
            "general", "Address", "Jakarta", "Phone",
            "PIC", "Position", "PICPhone", "email@test.com"
        );

        vm.prank(hospital1);
        profileContract.deactivateProfile();

        vm.prank(hospital1);
        vm.expectEmit(true, false, false, true);
        emit ProfileReactivated(hospital1, block.timestamp);
        
        profileContract.reactivateProfile();

        assertTrue(profileContract.isHospitalActive(hospital1));
    }

    function test_ReactivateProfile_RevertsIfAlreadyActive() public {
        vm.prank(hospital1);
        profileContract.setProfile(
            "general", "Address", "Jakarta", "Phone",
            "PIC", "Position", "PICPhone", "email@test.com"
        );

        vm.prank(hospital1);
        vm.expectRevert(MedichainHospitalProfile.ProfileAlreadyActive.selector);
        profileContract.reactivateProfile();
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // GET PROFILE TESTS
    // ═══════════════════════════════════════════════════════════════════════════

    function test_GetProfile_Success() public {
        vm.prank(hospital1);
        profileContract.setProfile(
            "general", "Address", "Jakarta", "Phone",
            "PIC", "Position", "PICPhone", "email@test.com"
        );

        // Anyone can read
        vm.prank(patient);
        MedichainHospitalProfile.HospitalProfile memory profile = 
            profileContract.getProfile(hospital1);

        assertEq(profile.name, "RS Medichain Jakarta");
    }

    function test_GetProfile_RevertsIfNotFound() public {
        vm.prank(patient);
        vm.expectRevert(MedichainHospitalProfile.ProfileNotFound.selector);
        profileContract.getProfile(hospital1);
    }

    function test_GetBasicInfo_Success() public {
        vm.prank(hospital1);
        profileContract.setProfile(
            "general", "Address", "Jakarta", "Phone",
            "PIC", "Position", "PICPhone", "email@test.com"
        );

        (
            string memory name,
            string memory hospitalType,
            string memory city,
            bool isVerified,
            bool isActive
        ) = profileContract.getBasicInfo(hospital1);

        assertEq(name, "RS Medichain Jakarta");
        assertEq(hospitalType, "general");
        assertEq(city, "Jakarta");
        assertTrue(isVerified);
        assertTrue(isActive);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // ENUMERATION TESTS
    // ═══════════════════════════════════════════════════════════════════════════

    function test_GetTotalHospitals() public {
        assertEq(profileContract.getTotalHospitals(), 0);

        vm.prank(hospital1);
        profileContract.setProfile(
            "general", "Address", "Jakarta", "Phone",
            "PIC", "Position", "PICPhone", "email@test.com"
        );

        assertEq(profileContract.getTotalHospitals(), 1);

        vm.prank(hospital2);
        profileContract.setProfile(
            "clinic", "Address", "Bandung", "Phone",
            "PIC", "Position", "PICPhone", "email@test.com"
        );

        assertEq(profileContract.getTotalHospitals(), 2);
    }

    function test_GetHospitalByIndex() public {
        vm.prank(hospital1);
        profileContract.setProfile(
            "general", "Address", "Jakarta", "Phone",
            "PIC", "Position", "PICPhone", "email@test.com"
        );

        vm.prank(hospital2);
        profileContract.setProfile(
            "clinic", "Address", "Bandung", "Phone",
            "PIC", "Position", "PICPhone", "email@test.com"
        );

        assertEq(profileContract.getHospitalByIndex(0), hospital1);
        assertEq(profileContract.getHospitalByIndex(1), hospital2);
    }

    function test_GetHospitalByIndex_RevertsOutOfBounds() public {
        vm.expectRevert(MedichainHospitalProfile.IndexOutOfBounds.selector);
        profileContract.getHospitalByIndex(0);
    }

    function test_GetHospitalsByCity() public {
        // Setup hospitals in different cities
        vm.prank(hospital1);
        profileContract.setProfile(
            "general", "Address", "Jakarta", "Phone",
            "PIC", "Position", "PICPhone", "email@test.com"
        );

        vm.prank(hospital2);
        profileContract.setProfile(
            "clinic", "Address", "Bandung", "Phone",
            "PIC", "Position", "PICPhone", "email@test.com"
        );

        vm.prank(hospital3);
        profileContract.setProfile(
            "laboratory", "Address", "Jakarta", "Phone",
            "PIC", "Position", "PICPhone", "email@test.com"
        );

        address[] memory jakartaHospitals = profileContract.getHospitalsByCity("Jakarta");
        assertEq(jakartaHospitals.length, 2);
        assertEq(jakartaHospitals[0], hospital1);
        assertEq(jakartaHospitals[1], hospital3);

        address[] memory bandungHospitals = profileContract.getHospitalsByCity("Bandung");
        assertEq(bandungHospitals.length, 1);
        assertEq(bandungHospitals[0], hospital2);
    }

    function test_GetHospitalsByCity_ExcludesInactive() public {
        vm.prank(hospital1);
        profileContract.setProfile(
            "general", "Address", "Jakarta", "Phone",
            "PIC", "Position", "PICPhone", "email@test.com"
        );

        vm.prank(hospital3);
        profileContract.setProfile(
            "laboratory", "Address", "Jakarta", "Phone",
            "PIC", "Position", "PICPhone", "email@test.com"
        );

        // Deactivate one hospital
        vm.prank(hospital1);
        profileContract.deactivateProfile();

        address[] memory jakartaHospitals = profileContract.getHospitalsByCity("Jakarta");
        assertEq(jakartaHospitals.length, 1);
        assertEq(jakartaHospitals[0], hospital3);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // IS HOSPITAL ACTIVE TESTS
    // ═══════════════════════════════════════════════════════════════════════════

    function test_IsHospitalActive_AllConditions() public {
        // No profile yet
        assertFalse(profileContract.isHospitalActive(hospital1));

        // Create profile
        vm.prank(hospital1);
        profileContract.setProfile(
            "general", "Address", "Jakarta", "Phone",
            "PIC", "Position", "PICPhone", "email@test.com"
        );
        assertTrue(profileContract.isHospitalActive(hospital1));

        // Deactivate
        vm.prank(hospital1);
        profileContract.deactivateProfile();
        assertFalse(profileContract.isHospitalActive(hospital1));

        // Reactivate
        vm.prank(hospital1);
        profileContract.reactivateProfile();
        assertTrue(profileContract.isHospitalActive(hospital1));
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // INTEGRATION TESTS
    // ═══════════════════════════════════════════════════════════════════════════

    function test_FullLifecycle() public {
        // 1. Hospital creates profile
        vm.prank(hospital1);
        profileContract.setProfile(
            "general", "Jl. Sudirman 123", "Jakarta", "+62211234567",
            "Dr. Budi", "Director", "+628123456789", "budi@rs.com"
        );
        assertTrue(profileContract.hasProfile(hospital1));
        assertTrue(profileContract.isHospitalActive(hospital1));

        // 2. Patient views hospital info
        vm.prank(patient);
        (string memory name, string memory hospitalType, string memory city, bool isVerified, bool isActive) = 
            profileContract.getBasicInfo(hospital1);
        assertEq(name, "RS Medichain Jakarta");
        assertEq(hospitalType, "general");
        assertEq(city, "Jakarta");
        assertTrue(isVerified);
        assertTrue(isActive);

        // 3. Hospital updates profile
        vm.prank(hospital1);
        profileContract.updateProfile(
            "specialist", "Jl. Thamrin 456", "Jakarta Pusat", "+62219876543",
            "Dr. Siti", "Chief Medical Officer", "+628987654321", "siti@rs.com"
        );

        // 4. Verify update
        MedichainHospitalProfile.HospitalProfile memory profile = 
            profileContract.getProfile(hospital1);
        assertEq(profile.hospitalType, "specialist");
        assertEq(profile.physicalAddress, "Jl. Thamrin 456");
        assertEq(profile.city, "Jakarta Pusat");

        // 5. Hospital deactivates
        vm.prank(hospital1);
        profileContract.deactivateProfile();
        assertFalse(profileContract.isHospitalActive(hospital1));

        // 6. Hospital reactivates
        vm.prank(hospital1);
        profileContract.reactivateProfile();
        assertTrue(profileContract.isHospitalActive(hospital1));
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // FUZZ TESTS
    // ═══════════════════════════════════════════════════════════════════════════

    function testFuzz_SetProfile_VariableData(
        string calldata physicalAddress,
        string calldata city,
        string calldata phone
    ) public {
        vm.assume(bytes(physicalAddress).length > 0);
        vm.assume(bytes(city).length > 0);
        vm.assume(bytes(phone).length > 0);
        vm.assume(bytes(physicalAddress).length < 1000);
        vm.assume(bytes(city).length < 100);
        vm.assume(bytes(phone).length < 50);

        vm.prank(hospital1);
        profileContract.setProfile(
            "general", physicalAddress, city, phone,
            "PIC", "Position", "PICPhone", "email@test.com"
        );

        MedichainHospitalProfile.HospitalProfile memory profile = 
            profileContract.getProfile(hospital1);
        
        assertEq(profile.physicalAddress, physicalAddress);
        assertEq(profile.city, city);
        assertEq(profile.phone, phone);
    }
}
