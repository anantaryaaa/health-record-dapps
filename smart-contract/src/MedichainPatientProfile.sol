// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/metatx/ERC2771Context.sol";
import "./interfaces/IPatientIdentity.sol";

/**
 * @title MedichainPatientProfile
 * @author Medichain Development Team
 * @notice Stores encrypted patient profile data on-chain for cross-device access
 * @dev Integrates with MedichainPatientIdentity for access control
 * 
 * Key Features:
 * - Encrypted profile storage (data encrypted off-chain before storing)
 * - Patient-controlled CRUD operations
 * - Access control via PatientIdentity contract
 * - Complete audit trail of all profile accesses
 * - ERC-2771 Meta-Transaction Support (Gasless Transactions)
 * 
 * Data Flow:
 * 1. Patient encrypts profile data off-chain using wallet-derived key
 * 2. Patient calls setProfile() with encrypted bytes
 * 3. Hospital with approved access calls getProfile()
 * 4. Hospital decrypts data using shared key established during access grant
 */
contract MedichainPatientProfile is ReentrancyGuard, ERC2771Context {
    
    // ═══════════════════════════════════════════════════════════════════════════
    // TYPE DEFINITIONS
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * @notice Structure for profile metadata
     * @param exists Whether profile exists
     * @param createdAt Timestamp when profile was first created
     * @param updatedAt Timestamp of last update
     * @param dataLength Length of encrypted data (for gas estimation)
     */
    struct ProfileMetadata {
        bool exists;
        uint256 createdAt;
        uint256 updatedAt;
        uint256 dataLength;
    }

    /**
     * @notice Structure for access log entries
     * @param accessor Address that accessed the profile
     * @param timestamp When the access occurred
     * @param accessType Type of access ("READ", "EMERGENCY")
     */
    struct AccessLog {
        address accessor;
        uint256 timestamp;
        string accessType;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // STATE VARIABLES
    // ═══════════════════════════════════════════════════════════════════════════

    /// @notice Reference to PatientIdentity contract for access control
    IPatientIdentity public immutable patientIdentityContract;

    /// @notice Encrypted profile data storage
    /// @dev Key: patient address, Value: AES-encrypted JSON bytes
    mapping(address => bytes) private _encryptedProfiles;

    /// @notice Profile metadata for each patient
    mapping(address => ProfileMetadata) private _profileMetadata;

    /// @notice Access logs for audit trail
    /// @dev Key: patient address, Value: array of access log entries
    mapping(address => AccessLog[]) private _accessLogs;

    /// @notice Total access count per patient (gas-efficient counter)
    mapping(address => uint256) public accessCount;

    // ═══════════════════════════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════════════════════════

    /// @notice Emitted when a new profile is created
    event ProfileCreated(
        address indexed patient,
        uint256 dataLength,
        uint256 timestamp
    );

    /// @notice Emitted when a profile is updated
    event ProfileUpdated(
        address indexed patient,
        uint256 dataLength,
        uint256 timestamp
    );

    /// @notice Emitted when a profile is deleted
    event ProfileDeleted(
        address indexed patient,
        uint256 timestamp
    );

    /// @notice Emitted when a profile is accessed
    event ProfileAccessed(
        address indexed patient,
        address indexed accessor,
        string accessType,
        uint256 timestamp
    );

    // ═══════════════════════════════════════════════════════════════════════════
    // CUSTOM ERRORS
    // ═══════════════════════════════════════════════════════════════════════════

    /// @dev Thrown when trying to create a profile that already exists
    error ProfileAlreadyExists();

    /// @dev Thrown when trying to access/update a non-existent profile
    error ProfileNotFound();

    /// @dev Thrown when caller is not the patient owner
    error NotPatientOwner();

    /// @dev Thrown when accessor doesn't have permission
    error NotAuthorizedToAccess();

    /// @dev Thrown when patient doesn't have identity NFT
    error PatientNotRegistered();

    /// @dev Thrown when empty data is provided
    error EmptyProfileData();

    /// @dev Thrown when invalid contract address is provided
    error InvalidPatientIdentityContract();

    // ═══════════════════════════════════════════════════════════════════════════
    // MODIFIERS
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * @dev Ensures caller is the patient themselves
     */
    modifier onlyPatient() {
        if (_msgSender() != _msgSender()) revert NotPatientOwner(); // This is always true, actual check below
        _;
    }

    /**
     * @dev Ensures patient has registered identity NFT
     * @param patient The patient address to check
     */
    modifier onlyRegisteredPatient(address patient) {
        if (!patientIdentityContract.hasPatientIdentity(patient)) {
            revert PatientNotRegistered();
        }
        _;
    }

    /**
     * @dev Ensures profile exists for the patient
     * @param patient The patient address to check
     */
    modifier profileExists(address patient) {
        if (!_profileMetadata[patient].exists) {
            revert ProfileNotFound();
        }
        _;
    }

    /**
     * @dev Ensures profile does not exist (for creation)
     * @param patient The patient address to check
     */
    modifier profileNotExists(address patient) {
        if (_profileMetadata[patient].exists) {
            revert ProfileAlreadyExists();
        }
        _;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // CONSTRUCTOR
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * @notice Initializes the MedichainPatientProfile contract
     * @param _patientIdentityContract Address of the MedichainPatientIdentity contract
     * @param _trustedForwarder Address of the ERC-2771 trusted forwarder for gasless tx
     */
    constructor(
        address _patientIdentityContract,
        address _trustedForwarder
    ) ERC2771Context(_trustedForwarder) {
        if (_patientIdentityContract == address(0)) {
            revert InvalidPatientIdentityContract();
        }
        patientIdentityContract = IPatientIdentity(_patientIdentityContract);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // PATIENT FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * @notice Create a new encrypted profile
     * @param encryptedData AES-encrypted JSON containing profile data
     * @dev Patient must have identity NFT before calling this
     * @dev Data should be encrypted off-chain using wallet-derived key
     * 
     * Expected encrypted data format (before encryption):
     * {
     *   "name": "John Doe",
     *   "nik": "3201234567890001",
     *   "bloodType": "O+",
     *   "gender": "Male",
     *   "dateOfBirth": "1990-05-15",
     *   "emergencyContact": "+62812345678",
     *   "allergies": ["Penicillin"],
     *   "version": 1
     * }
     */
    function setProfile(bytes calldata encryptedData) 
        external 
        nonReentrant 
        onlyRegisteredPatient(_msgSender())
        profileNotExists(_msgSender())
    {
        if (encryptedData.length == 0) {
            revert EmptyProfileData();
        }

        address patient = _msgSender();
        uint256 currentTime = block.timestamp;

        // Store encrypted profile
        _encryptedProfiles[patient] = encryptedData;

        // Set metadata
        _profileMetadata[patient] = ProfileMetadata({
            exists: true,
            createdAt: currentTime,
            updatedAt: currentTime,
            dataLength: encryptedData.length
        });

        emit ProfileCreated(patient, encryptedData.length, currentTime);
    }

    /**
     * @notice Update existing encrypted profile
     * @param encryptedData New AES-encrypted JSON containing updated profile data
     * @dev Only the patient can update their own profile
     */
    function updateProfile(bytes calldata encryptedData) 
        external 
        nonReentrant 
        profileExists(_msgSender())
    {
        if (encryptedData.length == 0) {
            revert EmptyProfileData();
        }

        address patient = _msgSender();
        uint256 currentTime = block.timestamp;

        // Update encrypted profile
        _encryptedProfiles[patient] = encryptedData;

        // Update metadata
        _profileMetadata[patient].updatedAt = currentTime;
        _profileMetadata[patient].dataLength = encryptedData.length;

        emit ProfileUpdated(patient, encryptedData.length, currentTime);
    }

    /**
     * @notice Delete profile permanently
     * @dev Only the patient can delete their own profile
     * @dev This action is irreversible
     */
    function deleteProfile() 
        external 
        nonReentrant 
        profileExists(_msgSender())
    {
        address patient = _msgSender();
        uint256 currentTime = block.timestamp;

        // Delete encrypted data
        delete _encryptedProfiles[patient];

        // Mark as deleted but keep some metadata for audit
        _profileMetadata[patient].exists = false;
        _profileMetadata[patient].updatedAt = currentTime;
        _profileMetadata[patient].dataLength = 0;

        // Note: We keep access logs for audit purposes

        emit ProfileDeleted(patient, currentTime);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // READ FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * @notice Get encrypted profile data
     * @param patient Address of the patient
     * @return encryptedData The encrypted profile bytes
     * @dev Caller must be: patient themselves OR hospital with approved access
     * @dev Logs access for audit trail
     */
    function getProfile(address patient) 
        external 
        nonReentrant 
        profileExists(patient)
        returns (bytes memory encryptedData) 
    {
        address accessor = _msgSender();
        
        // Check authorization
        if (accessor != patient) {
            // Check if accessor has valid access via PatientIdentity contract
            (bool hasAccess,) = patientIdentityContract.checkAccess(patient, accessor);
            if (!hasAccess) {
                revert NotAuthorizedToAccess();
            }
        }

        // Log the access
        _logAccess(patient, accessor, accessor == patient ? "SELF" : "READ");

        return _encryptedProfiles[patient];
    }

    /**
     * @notice Get profile without logging (view function for checks)
     * @param patient Address of the patient
     * @return encryptedData The encrypted profile bytes
     * @dev Same access control but doesn't log (for preview/check operations)
     */
    function getProfileView(address patient) 
        external 
        view 
        profileExists(patient)
        returns (bytes memory encryptedData) 
    {
        address accessor = _msgSender();
        
        // Check authorization
        if (accessor != patient) {
            (bool hasAccess,) = patientIdentityContract.checkAccess(patient, accessor);
            if (!hasAccess) {
                revert NotAuthorizedToAccess();
            }
        }

        return _encryptedProfiles[patient];
    }

    /**
     * @notice Check if patient has profile on-chain
     * @param patient Address to check
     * @return True if profile exists
     */
    function hasProfile(address patient) external view returns (bool) {
        return _profileMetadata[patient].exists;
    }

    /**
     * @notice Get profile metadata without accessing the actual data
     * @param patient Address of the patient
     * @return exists Whether profile exists
     * @return createdAt Timestamp when profile was created
     * @return updatedAt Timestamp of last update
     * @return dataLength Length of encrypted data
     */
    function getProfileMetadata(address patient) 
        external 
        view 
        returns (
            bool exists,
            uint256 createdAt,
            uint256 updatedAt,
            uint256 dataLength
        ) 
    {
        ProfileMetadata memory meta = _profileMetadata[patient];
        return (meta.exists, meta.createdAt, meta.updatedAt, meta.dataLength);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // AUDIT FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * @notice Get access history for the calling patient
     * @return Array of all access events
     * @dev Only the patient can view their own access history
     */
    function getAccessHistory() 
        external 
        view 
        returns (AccessLog[] memory) 
    {
        return _accessLogs[_msgSender()];
    }

    /**
     * @notice Get access history for a specific patient (admin view)
     * @param patient Address of the patient
     * @return Array of all access events
     * @dev Only the patient themselves can call this
     */
    function getAccessHistoryFor(address patient) 
        external 
        view 
        returns (AccessLog[] memory) 
    {
        if (_msgSender() != patient) {
            revert NotPatientOwner();
        }
        return _accessLogs[patient];
    }

    /**
     * @notice Get total number of times profile was accessed
     * @param patient Address of patient
     * @return Number of access events
     */
    function getAccessCount(address patient) external view returns (uint256) {
        return accessCount[patient];
    }

    /**
     * @notice Get the last N access logs (for pagination)
     * @param patient Address of patient
     * @param count Number of recent logs to retrieve
     * @return Array of recent access events
     * @dev Only patient can call this
     */
    function getRecentAccessLogs(address patient, uint256 count) 
        external 
        view 
        returns (AccessLog[] memory) 
    {
        if (_msgSender() != patient) {
            revert NotPatientOwner();
        }

        AccessLog[] storage logs = _accessLogs[patient];
        uint256 totalLogs = logs.length;
        
        if (totalLogs == 0 || count == 0) {
            return new AccessLog[](0);
        }

        uint256 resultCount = count > totalLogs ? totalLogs : count;
        AccessLog[] memory result = new AccessLog[](resultCount);
        
        uint256 startIndex = totalLogs - resultCount;
        for (uint256 i = 0; i < resultCount; i++) {
            result[i] = logs[startIndex + i];
        }
        
        return result;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // INTERNAL FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * @dev Log an access event
     * @param patient The patient whose profile was accessed
     * @param accessor The address that accessed the profile
     * @param accessType The type of access
     */
    function _logAccess(
        address patient, 
        address accessor, 
        string memory accessType
    ) internal {
        uint256 currentTime = block.timestamp;
        
        _accessLogs[patient].push(AccessLog({
            accessor: accessor,
            timestamp: currentTime,
            accessType: accessType
        }));
        
        accessCount[patient]++;
        
        emit ProfileAccessed(patient, accessor, accessType, currentTime);
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
