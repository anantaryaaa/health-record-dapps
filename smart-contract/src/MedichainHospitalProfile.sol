// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/metatx/ERC2771Context.sol";
import "./interfaces/IHospitalRegistryExtended.sol";

/**
 * @title MedichainHospitalProfile
 * @author Medichain Development Team
 * @notice Stores hospital profile data on-chain for cross-device access
 * @dev Integrates with AutomatedHospitalRegistry for verification status
 * 
 * Key Features:
 * - Full profile storage (type, address, city, phone, PIC info)
 * - Hospital-controlled CRUD operations
 * - Public read access for transparency
 * - Enumeration support (list all, filter by city)
 * - ERC-2771 Meta-Transaction Support (Gasless Transactions)
 * 
 * Data Flow:
 * 1. Hospital registers via AutomatedHospitalRegistry (name, license, verified)
 * 2. Hospital calls setProfile() to store complete profile data
 * 3. Patients can view hospital info when reviewing access requests
 */
contract MedichainHospitalProfile is ReentrancyGuard, ERC2771Context {
    
    // ═══════════════════════════════════════════════════════════════════════════
    // TYPE DEFINITIONS
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * @notice Structure for hospital profile data
     */
    struct HospitalProfile {
        // Basic Info
        string name;              // From registry, cached for convenience
        string hospitalType;      // "general", "clinic", "laboratory", "specialist"
        string licenseNumber;     // From registry, cached for convenience
        // Location
        string physicalAddress;
        string city;
        string phone;
        // PIC (Person in Charge) Info
        string picName;
        string picPosition;
        string picPhone;
        string picEmail;
        // Metadata
        uint256 createdAt;
        uint256 updatedAt;
        bool isActive;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // STATE VARIABLES
    // ═══════════════════════════════════════════════════════════════════════════

    /// @notice Reference to AutomatedHospitalRegistry for verification check
    IHospitalRegistryExtended public immutable hospitalRegistry;

    /// @notice Hospital profiles storage
    mapping(address => HospitalProfile) private _profiles;

    /// @notice Quick check if hospital has profile
    mapping(address => bool) public hasProfile;

    /// @notice List of all registered hospitals for enumeration
    address[] private _registeredHospitals;

    /// @notice Index mapping for O(1) lookup in array
    mapping(address => uint256) private _hospitalIndex;

    /// @notice Valid hospital types
    bytes32 private constant TYPE_GENERAL = keccak256("general");
    bytes32 private constant TYPE_CLINIC = keccak256("clinic");
    bytes32 private constant TYPE_LABORATORY = keccak256("laboratory");
    bytes32 private constant TYPE_SPECIALIST = keccak256("specialist");

    // ═══════════════════════════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════════════════════════

    /// @notice Emitted when a new profile is created
    event ProfileCreated(
        address indexed hospital,
        string name,
        string hospitalType,
        string city,
        uint256 timestamp
    );

    /// @notice Emitted when a profile is updated
    event ProfileUpdated(
        address indexed hospital,
        uint256 timestamp
    );

    /// @notice Emitted when a profile is deactivated
    event ProfileDeactivated(
        address indexed hospital,
        uint256 timestamp
    );

    /// @notice Emitted when a profile is reactivated
    event ProfileReactivated(
        address indexed hospital,
        uint256 timestamp
    );

    // ═══════════════════════════════════════════════════════════════════════════
    // CUSTOM ERRORS
    // ═══════════════════════════════════════════════════════════════════════════

    /// @dev Thrown when trying to create a profile that already exists
    error ProfileAlreadyExists();

    /// @dev Thrown when trying to access/update a non-existent profile
    error ProfileNotFound();

    /// @dev Thrown when caller is not the hospital owner
    error NotHospitalOwner();

    /// @dev Thrown when hospital is not verified in registry
    error HospitalNotVerified();

    /// @dev Thrown when profile is not active
    error ProfileNotActive();

    /// @dev Thrown when profile is already active
    error ProfileAlreadyActive();

    /// @dev Thrown when required field is empty
    error EmptyRequiredField();

    /// @dev Thrown when hospital type is invalid
    error InvalidHospitalType();

    /// @dev Thrown when registry address is invalid
    error InvalidRegistryAddress();

    /// @dev Thrown when index is out of bounds
    error IndexOutOfBounds();

    // ═══════════════════════════════════════════════════════════════════════════
    // MODIFIERS
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * @dev Ensures caller is a verified hospital in the registry
     */
    modifier onlyVerifiedHospital() {
        if (!hospitalRegistry.isHospitalVerified(_msgSender())) {
            revert HospitalNotVerified();
        }
        _;
    }

    /**
     * @dev Ensures caller has a profile
     */
    modifier onlyProfileOwner() {
        if (!hasProfile[_msgSender()]) {
            revert ProfileNotFound();
        }
        _;
    }

    /**
     * @dev Ensures profile does not exist (for creation)
     */
    modifier profileNotExists() {
        if (hasProfile[_msgSender()]) {
            revert ProfileAlreadyExists();
        }
        _;
    }

    /**
     * @dev Validates hospital type
     */
    modifier validHospitalType(string calldata hospitalType) {
        bytes32 typeHash = keccak256(bytes(hospitalType));
        if (
            typeHash != TYPE_GENERAL &&
            typeHash != TYPE_CLINIC &&
            typeHash != TYPE_LABORATORY &&
            typeHash != TYPE_SPECIALIST
        ) {
            revert InvalidHospitalType();
        }
        _;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // CONSTRUCTOR
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * @notice Initializes the MedichainHospitalProfile contract
     * @param _hospitalRegistry Address of the AutomatedHospitalRegistry contract
     * @param _trustedForwarder Address of the ERC-2771 trusted forwarder for gasless tx
     */
    constructor(
        address _hospitalRegistry,
        address _trustedForwarder
    ) ERC2771Context(_trustedForwarder) {
        if (_hospitalRegistry == address(0)) {
            revert InvalidRegistryAddress();
        }
        hospitalRegistry = IHospitalRegistryExtended(_hospitalRegistry);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // HOSPITAL FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * @notice Set hospital profile (hospital only, must be verified first)
     * @param hospitalType Type: "general", "clinic", "laboratory", "specialist"
     * @param physicalAddress Physical address of the hospital
     * @param city City where hospital is located
     * @param phone Contact phone number
     * @param picName Name of Person in Charge
     * @param picPosition Position of PIC
     * @param picPhone PIC contact phone
     * @param picEmail PIC email address
     * @dev Hospital must be verified in AutomatedHospitalRegistry first
     */
    function setProfile(
        string calldata hospitalType,
        string calldata physicalAddress,
        string calldata city,
        string calldata phone,
        string calldata picName,
        string calldata picPosition,
        string calldata picPhone,
        string calldata picEmail
    ) 
        external 
        nonReentrant 
        onlyVerifiedHospital
        profileNotExists
        validHospitalType(hospitalType)
    {
        // Validate required fields
        if (bytes(physicalAddress).length == 0) revert EmptyRequiredField();
        if (bytes(city).length == 0) revert EmptyRequiredField();
        if (bytes(phone).length == 0) revert EmptyRequiredField();

        address hospital = _msgSender();
        uint256 currentTime = block.timestamp;

        // Get name and license from registry
        (string memory name, string memory licenseNumber, , ) = 
            hospitalRegistry.getHospitalDetails(hospital);

        // Store profile
        _profiles[hospital] = HospitalProfile({
            name: name,
            hospitalType: hospitalType,
            licenseNumber: licenseNumber,
            physicalAddress: physicalAddress,
            city: city,
            phone: phone,
            picName: picName,
            picPosition: picPosition,
            picPhone: picPhone,
            picEmail: picEmail,
            createdAt: currentTime,
            updatedAt: currentTime,
            isActive: true
        });

        // Mark as having profile
        hasProfile[hospital] = true;

        // Add to enumeration
        _hospitalIndex[hospital] = _registeredHospitals.length;
        _registeredHospitals.push(hospital);

        emit ProfileCreated(hospital, name, hospitalType, city, currentTime);
    }

    /**
     * @notice Update existing profile
     * @dev Only the hospital can update their own profile
     */
    function updateProfile(
        string calldata hospitalType,
        string calldata physicalAddress,
        string calldata city,
        string calldata phone,
        string calldata picName,
        string calldata picPosition,
        string calldata picPhone,
        string calldata picEmail
    ) 
        external 
        nonReentrant 
        onlyProfileOwner
        validHospitalType(hospitalType)
    {
        // Validate required fields
        if (bytes(physicalAddress).length == 0) revert EmptyRequiredField();
        if (bytes(city).length == 0) revert EmptyRequiredField();
        if (bytes(phone).length == 0) revert EmptyRequiredField();

        address hospital = _msgSender();
        uint256 currentTime = block.timestamp;

        HospitalProfile storage profile = _profiles[hospital];
        
        profile.hospitalType = hospitalType;
        profile.physicalAddress = physicalAddress;
        profile.city = city;
        profile.phone = phone;
        profile.picName = picName;
        profile.picPosition = picPosition;
        profile.picPhone = picPhone;
        profile.picEmail = picEmail;
        profile.updatedAt = currentTime;

        emit ProfileUpdated(hospital, currentTime);
    }

    /**
     * @notice Deactivate profile (soft delete)
     * @dev Only the hospital can deactivate their own profile
     */
    function deactivateProfile() 
        external 
        nonReentrant 
        onlyProfileOwner 
    {
        address hospital = _msgSender();
        HospitalProfile storage profile = _profiles[hospital];
        
        if (!profile.isActive) {
            revert ProfileNotActive();
        }

        profile.isActive = false;
        profile.updatedAt = block.timestamp;

        emit ProfileDeactivated(hospital, block.timestamp);
    }

    /**
     * @notice Reactivate profile
     * @dev Only the hospital can reactivate their own profile
     */
    function reactivateProfile() 
        external 
        nonReentrant 
        onlyProfileOwner 
    {
        address hospital = _msgSender();
        HospitalProfile storage profile = _profiles[hospital];
        
        if (profile.isActive) {
            revert ProfileAlreadyActive();
        }

        profile.isActive = true;
        profile.updatedAt = block.timestamp;

        emit ProfileReactivated(hospital, block.timestamp);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // READ FUNCTIONS (PUBLIC)
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * @notice Get full hospital profile
     * @param hospital Address of the hospital
     * @return HospitalProfile struct
     * @dev Public - anyone can view hospital info for transparency
     */
    function getProfile(address hospital) 
        external 
        view 
        returns (HospitalProfile memory) 
    {
        if (!hasProfile[hospital]) {
            revert ProfileNotFound();
        }
        return _profiles[hospital];
    }

    /**
     * @notice Check if hospital has profile
     * @param hospital Address to check
     * @return True if profile exists
     */
    function profileExists(address hospital) external view returns (bool) {
        return hasProfile[hospital];
    }

    /**
     * @notice Check if hospital is fully active (has profile + verified + active)
     * @param hospital Address to check
     * @return True if hospital is fully operational
     */
    function isHospitalActive(address hospital) external view returns (bool) {
        if (!hasProfile[hospital]) return false;
        if (!_profiles[hospital].isActive) return false;
        if (!hospitalRegistry.isHospitalVerified(hospital)) return false;
        return true;
    }

    /**
     * @notice Get total number of registered hospitals
     * @return Count of hospitals with profiles
     */
    function getTotalHospitals() external view returns (uint256) {
        return _registeredHospitals.length;
    }

    /**
     * @notice Get hospital address by index (for enumeration)
     * @param index Index in the hospitals array
     * @return Hospital address at that index
     */
    function getHospitalByIndex(uint256 index) external view returns (address) {
        if (index >= _registeredHospitals.length) {
            revert IndexOutOfBounds();
        }
        return _registeredHospitals[index];
    }

    /**
     * @notice Get list of hospitals in a city
     * @param city City name to filter
     * @return Array of hospital addresses in that city
     * @dev Gas intensive for large datasets - use off-chain indexing for production
     */
    function getHospitalsByCity(string calldata city) 
        external 
        view 
        returns (address[] memory) 
    {
        bytes32 cityHash = keccak256(bytes(city));
        
        // First pass: count matches
        uint256 count = 0;
        for (uint256 i = 0; i < _registeredHospitals.length; i++) {
            address hospital = _registeredHospitals[i];
            if (
                _profiles[hospital].isActive &&
                keccak256(bytes(_profiles[hospital].city)) == cityHash
            ) {
                count++;
            }
        }

        // Second pass: collect matches
        address[] memory result = new address[](count);
        uint256 idx = 0;
        for (uint256 i = 0; i < _registeredHospitals.length; i++) {
            address hospital = _registeredHospitals[i];
            if (
                _profiles[hospital].isActive &&
                keccak256(bytes(_profiles[hospital].city)) == cityHash
            ) {
                result[idx] = hospital;
                idx++;
            }
        }

        return result;
    }

    /**
     * @notice Get basic info for display (optimized for frontend)
     * @param hospital Address of the hospital
     * @return name Hospital name
     * @return hospitalType Type of hospital
     * @return city City location
     * @return isVerified Verification status from registry
     * @return isActive Profile active status
     */
    function getBasicInfo(address hospital) 
        external 
        view 
        returns (
            string memory name,
            string memory hospitalType,
            string memory city,
            bool isVerified,
            bool isActive
        ) 
    {
        if (!hasProfile[hospital]) {
            revert ProfileNotFound();
        }
        
        HospitalProfile memory profile = _profiles[hospital];
        bool verified = hospitalRegistry.isHospitalVerified(hospital);
        
        return (
            profile.name,
            profile.hospitalType,
            profile.city,
            verified,
            profile.isActive
        );
    }

    /**
     * @notice Get profile metadata without full data
     * @param hospital Address of the hospital
     * @return createdAt When profile was created
     * @return updatedAt When profile was last updated
     * @return isActive Whether profile is active
     */
    function getProfileMetadata(address hospital)
        external
        view
        returns (
            uint256 createdAt,
            uint256 updatedAt,
            bool isActive
        )
    {
        if (!hasProfile[hospital]) {
            revert ProfileNotFound();
        }
        
        HospitalProfile memory profile = _profiles[hospital];
        return (profile.createdAt, profile.updatedAt, profile.isActive);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // ERC2771 CONTEXT OVERRIDES
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * @dev Override _msgSender to support meta-transactions
     */
    function _msgSender() 
        internal 
        view 
        override 
        returns (address) 
    {
        return ERC2771Context._msgSender();
    }

    /**
     * @dev Override _msgData to support meta-transactions
     */
    function _msgData() 
        internal 
        view 
        override 
        returns (bytes calldata) 
    {
        return ERC2771Context._msgData();
    }

    /**
     * @dev Override _contextSuffixLength for ERC2771
     */
    function _contextSuffixLength() 
        internal 
        view 
        override 
        returns (uint256) 
    {
        return ERC2771Context._contextSuffixLength();
    }
}
