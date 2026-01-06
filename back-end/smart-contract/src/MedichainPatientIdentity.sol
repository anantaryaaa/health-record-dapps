// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import "@openzeppelin/contracts/metatx/ERC2771Context.sol";

/**
 * @title IHospitalRegistry
 * @notice Interface for AutomatedHospitalRegistry contract
 * @dev Used to check if a hospital is verified in the external registry
 */
interface IHospitalRegistry {
    struct Hospital {
        string name;
        string licenseNumber;
        address wallet;
        bool isVerified;
    }
    
    function hospitals(address wallet) external view returns (
        string memory name,
        string memory licenseNumber,
        address walletAddress,
        bool isVerified
    );
}

/**
 * @title MedichainPatientIdentity
 * @author Medichain Development Team
 * @notice This contract manages patient identity as Soulbound Tokens (SBT) and 
 *         provides patient-centric access control for medical data sharing.
 * @dev Implements ERC-721 with transfer restrictions (Soulbound), AccessControl for 
 *      role management, and ReentrancyGuard for security. Designed for the Lisk blockchain.
 * 
 * Key Features:
 * - Soulbound NFT Identity (non-transferable ERC-721)
 * - Patient-controlled access permissions with temporal expiry
 * - Medical record reference registry (IPFS CID tracking)
 * - Event-driven architecture for frontend notifications
 * - ERC-2771 Meta-Transaction Support (Gasless Transactions)
 */
contract MedichainPatientIdentity is ERC721, AccessControl, ReentrancyGuard, ERC2771Context {
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;

    // ═══════════════════════════════════════════════════════════════════════════
    // ROLES
    // ═══════════════════════════════════════════════════════════════════════════
    
    /// @dev Role for system administrators who can whitelist hospitals
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    
    /// @dev Role for verified/whitelisted hospitals that can add medical records
    bytes32 public constant HOSPITAL_ROLE = keccak256("HOSPITAL_ROLE");

    // ═══════════════════════════════════════════════════════════════════════════
    // DATA STRUCTURES
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * @notice Struct representing a temporary access permission
     * @param isGranted Whether access is currently granted
     * @param expiresAt Unix timestamp when the access expires (0 = permanent until revoked)
     * @param grantedAt Unix timestamp when access was granted
     * @param accessType Type of access (e.g., "FULL", "READ_ONLY", "SPECIFIC_PERIOD")
     */
    struct AccessPermission {
        bool isGranted;
        uint256 expiresAt;
        uint256 grantedAt;
        string accessType;
    }

    /**
     * @notice Struct representing a medical record reference
     * @param ipfsCid IPFS Content Identifier (CID) of the encrypted medical data
     * @param dataHash SHA-256 hash of the original data for integrity verification
     * @param hospitalAddress Address of the hospital that created the record
     * @param timestamp Unix timestamp when the record was added
     * @param icd10Code ICD-10 disease classification code
     * @param recordType Type of medical record (e.g., "DIAGNOSIS", "LAB_RESULT", "IMAGING")
     * @param isVerified Whether the record has been verified by validators
     */
    struct MedicalRecordRef {
        string ipfsCid;
        bytes32 dataHash;
        address hospitalAddress;
        uint256 timestamp;
        string icd10Code;
        string recordType;
        bool isVerified;
    }

    /**
     * @notice Struct representing patient profile metadata
     * @param isRegistered Whether the patient is registered in the system
     * @param registrationTimestamp Unix timestamp of registration
     * @param totalRecords Total number of medical records
     * @param lastActivityTimestamp Last activity timestamp
     */
    struct PatientProfile {
        bool isRegistered;
        uint256 registrationTimestamp;
        uint256 totalRecords;
        uint256 lastActivityTimestamp;
    }

    /**
     * @notice Struct representing an access request from hospital to patient
     * @param hospitalAddress Address of the hospital requesting access
     * @param hospitalName Name of the hospital (for display purposes)
     * @param requestedAt Unix timestamp when request was made
     * @param accessDuration Requested access duration in seconds (0 = until revoked)
     * @param message Optional message from hospital
     * @param status Request status: 0=Pending, 1=Approved, 2=Rejected
     */
    struct AccessRequest {
        address hospitalAddress;
        string hospitalName;
        uint256 requestedAt;
        uint256 accessDuration;
        string message;
        uint8 status; // 0=Pending, 1=Approved, 2=Rejected
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // STATE VARIABLES
    // ═══════════════════════════════════════════════════════════════════════════

    /// @notice Counter for generating unique patient IDs
    uint256 private _patientIdCounter;

    /// @notice Mapping from wallet address to patient ID (NFT token ID)
    mapping(address => uint256) public walletToPatientId;

    /// @notice Mapping from patient ID to wallet address (reverse lookup)
    mapping(uint256 => address) public patientIdToWallet;

    /// @notice Permission matrix: patient => (accessor => AccessPermission)
    mapping(address => mapping(address => AccessPermission)) public accessPermissions;

    /// @notice Patient profiles: patient address => PatientProfile
    mapping(address => PatientProfile) public patientProfiles;

    /// @notice Medical records for each patient: patient address => MedicalRecordRef[]
    mapping(address => MedicalRecordRef[]) private _patientRecords;

    /// @notice List of addresses that have been granted access by a patient
    mapping(address => address[]) private _grantedAccessList;

    /// @notice Tracking of unique data hashes to prevent duplicates
    mapping(bytes32 => bool) public recordHashExists;

    /// @notice Whitelisted hospitals mapping for quick lookup
    mapping(address => bool) public isWhitelistedHospital;

    /// @notice Pending access requests: patient => AccessRequest[]
    mapping(address => AccessRequest[]) private _pendingAccessRequests;

    /// @notice Counter for access request IDs
    uint256 private _accessRequestCounter;

    /// @notice Reference to the external Hospital Registry contract
    IHospitalRegistry public hospitalRegistry;

    // ═══════════════════════════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * @notice Emitted when a new patient identity is minted
     * @param patientWallet The wallet address of the patient
     * @param patientId The unique patient ID (NFT token ID)
     * @param timestamp The timestamp of registration
     */
    event IdentityMinted(
        address indexed patientWallet,
        uint256 indexed patientId,
        uint256 timestamp
    );

    /**
     * @notice Emitted when access is granted to an entity (Hospital/Doctor)
     * @param patient The patient granting access
     * @param accessor The entity receiving access
     * @param accessType The type of access granted
     * @param expiresAt The expiration timestamp (0 = until revoked)
     */
    event AccessGranted(
        address indexed patient,
        address indexed accessor,
        string accessType,
        uint256 expiresAt
    );

    /**
     * @notice Emitted when access is revoked from an entity
     * @param patient The patient revoking access
     * @param accessor The entity losing access
     * @param timestamp The timestamp of revocation
     */
    event AccessRevoked(
        address indexed patient,
        address indexed accessor,
        uint256 timestamp
    );

    /**
     * @notice Emitted when a new medical record reference is added
     * @param patient The patient whose record was added
     * @param hospital The hospital that added the record
     * @param ipfsCid The IPFS CID of the encrypted data
     * @param recordIndex The index of the record in patient's history
     * @param icd10Code The ICD-10 classification code
     */
    event RecordAdded(
        address indexed patient,
        address indexed hospital,
        string ipfsCid,
        uint256 recordIndex,
        string icd10Code
    );

    /**
     * @notice Emitted when a medical record is verified by validators
     * @param patient The patient whose record was verified
     * @param recordIndex The index of the verified record
     * @param timestamp The timestamp of verification
     */
    event RecordVerified(
        address indexed patient,
        uint256 recordIndex,
        uint256 timestamp
    );

    /**
     * @notice Emitted when a hospital is whitelisted
     * @param hospital The hospital address
     * @param hospitalName The name/identifier of the hospital
     */
    event HospitalWhitelisted(
        address indexed hospital,
        string hospitalName
    );

    /**
     * @notice Emitted when a hospital is removed from whitelist
     * @param hospital The hospital address
     */
    event HospitalRemovedFromWhitelist(address indexed hospital);

    /**
     * @notice Emitted when the external hospital registry is updated
     * @param registryAddress The new hospital registry address
     */
    event HospitalRegistryUpdated(address indexed registryAddress);

    /**
     * @notice Emitted when a hospital requests access to a patient's data (via QR scan)
     * @param patient The patient being requested
     * @param hospital The hospital requesting access
     * @param hospitalName The name of the hospital
     * @param requestIndex The index of this request in patient's pending list
     * @param accessDuration Requested access duration in seconds
     */
    event AccessRequested(
        address indexed patient,
        address indexed hospital,
        string hospitalName,
        uint256 requestIndex,
        uint256 accessDuration
    );

    /**
     * @notice Emitted when patient approves an access request
     * @param patient The patient approving access
     * @param hospital The hospital receiving access
     * @param requestIndex The index of the approved request
     */
    event AccessRequestApproved(
        address indexed patient,
        address indexed hospital,
        uint256 requestIndex
    );

    /**
     * @notice Emitted when patient rejects an access request
     * @param patient The patient rejecting access
     * @param hospital The hospital whose request was rejected
     * @param requestIndex The index of the rejected request
     */
    event AccessRequestRejected(
        address indexed patient,
        address indexed hospital,
        uint256 requestIndex
    );

    // ═══════════════════════════════════════════════════════════════════════════
    // ERRORS
    // ═══════════════════════════════════════════════════════════════════════════

    /// @dev Error when trying to transfer a Soulbound token
    error SoulboundTokenNonTransferable();

    /// @dev Error when patient is already registered
    error PatientAlreadyRegistered();

    /// @dev Error when patient is not registered
    error PatientNotRegistered();

    /// @dev Error when caller is not the patient owner
    error NotPatientOwner();

    /// @dev Error when hospital is not whitelisted
    error HospitalNotWhitelisted();

    /// @dev Error when access has expired
    error AccessExpired();

    /// @dev Error when access is not granted
    error AccessNotGranted();

    /// @dev Error when duplicate record hash is detected
    error DuplicateRecordHash();

    /// @dev Error when invalid expiry timestamp is provided
    error InvalidExpiryTimestamp();

    /// @dev Error when zero address is provided
    error ZeroAddressNotAllowed();

    /// @dev Error when invalid record index is provided
    error InvalidRecordIndex();

    /// @dev Error when access request index is invalid
    error InvalidAccessRequestIndex();

    /// @dev Error when access request is not pending
    error AccessRequestNotPending();

    /// @dev Error when hospital already has a pending request
    error AccessRequestAlreadyPending();

    // ═══════════════════════════════════════════════════════════════════════════
    // MODIFIERS
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * @dev Modifier to check if the caller is a registered patient
     * @dev Uses _msgSender() for ERC-2771 meta-transaction support
     */
    modifier onlyRegisteredPatient() {
        if (!patientProfiles[_msgSender()].isRegistered) {
            revert PatientNotRegistered();
        }
        _;
    }

    /**
     * @dev Modifier to check if address is not zero
     * @param _address The address to check
     */
    modifier notZeroAddress(address _address) {
        if (_address == address(0)) {
            revert ZeroAddressNotAllowed();
        }
        _;
    }

    /**
     * @dev Modifier to check if hospital is whitelisted
     * @dev Hospital is valid if: (1) locally whitelisted OR (2) verified in external HospitalRegistry
     * @param _hospital The hospital address to check
     */
    modifier onlyWhitelistedHospital(address _hospital) {
        if (!_isHospitalAuthorized(_hospital)) {
            revert HospitalNotWhitelisted();
        }
        _;
    }

    /**
     * @dev Internal function to check if hospital is authorized from any source
     * @param _hospital The hospital address to check
     * @return True if hospital is authorized (local whitelist OR external registry)
     */
    function _isHospitalAuthorized(address _hospital) internal view returns (bool) {
        // Check local whitelist first
        if (isWhitelistedHospital[_hospital]) {
            return true;
        }
        
        // Check external hospital registry if set
        if (address(hospitalRegistry) != address(0)) {
            try hospitalRegistry.hospitals(_hospital) returns (
                string memory,
                string memory,
                address,
                bool isVerified
            ) {
                return isVerified;
            } catch {
                return false;
            }
        }
        
        return false;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // CONSTRUCTOR
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * @notice Initializes the Medichain Patient Identity contract
     * @dev Sets up the ERC-721 token with name and symbol, grants admin role to deployer
     * @param _hospitalRegistry Optional address of AutomatedHospitalRegistry (can be address(0))
     * @param _trustedForwarder Address of the ERC-2771 trusted forwarder for gasless transactions
     */
    constructor(
        address _hospitalRegistry, 
        address _trustedForwarder
    ) ERC721("Medichain Patient Identity", "MEDID") ERC2771Context(_trustedForwarder) {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        _patientIdCounter = 1; // Start from 1, 0 is reserved for "not registered"
        
        if (_hospitalRegistry != address(0)) {
            hospitalRegistry = IHospitalRegistry(_hospitalRegistry);
        }
    }

    /**
     * @notice Sets or updates the external Hospital Registry contract address
     * @dev Only admins can update this. Set to address(0) to disable external registry check.
     * @param _hospitalRegistry The address of the AutomatedHospitalRegistry contract
     */
    function setHospitalRegistry(address _hospitalRegistry) 
        external 
        onlyRole(ADMIN_ROLE) 
    {
        hospitalRegistry = IHospitalRegistry(_hospitalRegistry);
        emit HospitalRegistryUpdated(_hospitalRegistry);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // IDENTITY MANAGEMENT (SBT Pattern)
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * @notice Allows a patient to register themselves and mint their own identity NFT
     * @dev This is the self-registration function for patients. Creates a unique,
     *      non-transferable NFT that serves as the patient's identity.
     * @return patientId The unique patient ID assigned
     * 
     * Requirements:
     * - Caller must not already have an identity
     * 
     * Emits:
     * - {IdentityMinted} event
     * - Standard ERC-721 {Transfer} event
     */
    function selfRegister() 
        external 
        nonReentrant
        returns (uint256 patientId) 
    {
        address patientWallet = _msgSender();
        
        // Check patient is not already registered
        if (patientProfiles[patientWallet].isRegistered) {
            revert PatientAlreadyRegistered();
        }

        // Generate new patient ID
        patientId = _patientIdCounter;
        _patientIdCounter++;

        // Mint the Soulbound NFT
        _safeMint(patientWallet, patientId);

        // Update mappings
        walletToPatientId[patientWallet] = patientId;
        patientIdToWallet[patientId] = patientWallet;

        // Initialize patient profile
        patientProfiles[patientWallet] = PatientProfile({
            isRegistered: true,
            registrationTimestamp: block.timestamp,
            totalRecords: 0,
            lastActivityTimestamp: block.timestamp
        });

        emit IdentityMinted(patientWallet, patientId, block.timestamp);

        return patientId;
    }

    /**
     * @notice Mints a new Soulbound patient identity NFT (admin/hospital only)
     * @dev Called by the system during patient onboarding. Creates a unique, 
     *      non-transferable NFT that serves as the patient's identity.
     * @param _patientWallet The wallet address of the patient
     * @return patientId The unique patient ID assigned
     * 
     * Requirements:
     * - Caller must have ADMIN_ROLE or HOSPITAL_ROLE
     * - Patient wallet must not already have an identity
     * - Patient wallet must not be zero address
     * 
     * Emits:
     * - {IdentityMinted} event
     * - Standard ERC-721 {Transfer} event
     */
    function mintIdentity(address _patientWallet) 
        external 
        nonReentrant
        notZeroAddress(_patientWallet)
        returns (uint256 patientId) 
    {
        // Check caller has appropriate role
        require(
            hasRole(ADMIN_ROLE, msg.sender) || hasRole(HOSPITAL_ROLE, msg.sender),
            "Caller is not authorized to mint identities"
        );

        // Check patient is not already registered
        if (patientProfiles[_patientWallet].isRegistered) {
            revert PatientAlreadyRegistered();
        }

        // Generate new patient ID
        patientId = _patientIdCounter;
        _patientIdCounter++;

        // Mint the Soulbound NFT
        _safeMint(_patientWallet, patientId);

        // Update mappings
        walletToPatientId[_patientWallet] = patientId;
        patientIdToWallet[patientId] = _patientWallet;

        // Initialize patient profile
        patientProfiles[_patientWallet] = PatientProfile({
            isRegistered: true,
            registrationTimestamp: block.timestamp,
            totalRecords: 0,
            lastActivityTimestamp: block.timestamp
        });

        emit IdentityMinted(_patientWallet, patientId, block.timestamp);

        return patientId;
    }

    /**
     * @notice Gets the patient ID for a given wallet address
     * @dev Returns 0 if the patient is not registered
     * @param _patientWallet The wallet address to query
     * @return The patient ID (0 if not registered)
     */
    function getPatientId(address _patientWallet) 
        external 
        view 
        returns (uint256) 
    {
        return walletToPatientId[_patientWallet];
    }

    /**
     * @notice Checks if a wallet has a registered patient identity
     * @param _wallet The wallet address to check
     * @return True if the wallet has a patient identity
     */
    function hasPatientIdentity(address _wallet) 
        external 
        view 
        returns (bool) 
    {
        return patientProfiles[_wallet].isRegistered;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // SOULBOUND TRANSFER RESTRICTIONS
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * @notice Override to prevent token transfers (Soulbound implementation)
     * @dev This function always reverts except for minting (from = address(0))
     * @param to The recipient address
     * @param tokenId The token ID being transferred
     * @param auth The address authorized for the transfer
     * @return The previous owner (only returns for minting operations)
     */
    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal virtual override returns (address) {
        address from = _ownerOf(tokenId);
        
        // Allow minting (from == address(0)) but prevent all transfers
        if (from != address(0) && to != address(0)) {
            revert SoulboundTokenNonTransferable();
        }
        
        // Allow burning (to == address(0)) - may be needed for recovery scenarios
        // Note: In production, burning should be carefully controlled
        
        return super._update(to, tokenId, auth);
    }

    /**
     * @notice Override approve to prevent approvals (Soulbound)
     * @dev Always reverts as Soulbound tokens cannot be approved for transfer
     */
    function approve(address, uint256) public virtual override {
        revert SoulboundTokenNonTransferable();
    }

    /**
     * @notice Override setApprovalForAll to prevent approvals (Soulbound)
     * @dev Always reverts as Soulbound tokens cannot have operator approvals
     */
    function setApprovalForAll(address, bool) public virtual override {
        revert SoulboundTokenNonTransferable();
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // ACCESS CONTROL MANAGEMENT (Patient-Centric)
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * @notice Grants access permission to a hospital/doctor address
     * @dev Only the patient (data owner) can grant access to their data. 
     *      Supports temporary access with expiration timestamp.
     * @param _accessor The address of the hospital/doctor to grant access
     * @param _accessType The type of access (e.g., "FULL", "READ_ONLY", "1_YEAR_HISTORY")
     * @param _expiresAt Unix timestamp when access expires (0 = permanent until revoked)
     * 
     * Requirements:
     * - Caller must be a registered patient
     * - Accessor must be a whitelisted hospital
     * - If expiry is set, it must be in the future
     * 
     * Emits:
     * - {AccessGranted} event
     */
    function grantAccess(
        address _accessor,
        string calldata _accessType,
        uint256 _expiresAt
    ) 
        external 
        nonReentrant
        onlyRegisteredPatient
        notZeroAddress(_accessor)
        onlyWhitelistedHospital(_accessor)
    {
        address sender = _msgSender();
        
        // Validate expiry timestamp if provided
        if (_expiresAt != 0 && _expiresAt <= block.timestamp) {
            revert InvalidExpiryTimestamp();
        }

        // Check if this is a new accessor
        if (!accessPermissions[sender][_accessor].isGranted) {
            _grantedAccessList[sender].push(_accessor);
        }

        // Update permission matrix
        accessPermissions[sender][_accessor] = AccessPermission({
            isGranted: true,
            expiresAt: _expiresAt,
            grantedAt: block.timestamp,
            accessType: _accessType
        });

        // Update last activity
        patientProfiles[sender].lastActivityTimestamp = block.timestamp;

        emit AccessGranted(sender, _accessor, _accessType, _expiresAt);
    }

    /**
     * @notice Revokes access permission from a hospital/doctor address
     * @dev Only the patient (data owner) can revoke access to their data
     * @param _accessor The address of the hospital/doctor to revoke access from
     * 
     * Requirements:
     * - Caller must be a registered patient
     * - Access must have been previously granted
     * 
     * Emits:
     * - {AccessRevoked} event
     */
    function revokeAccess(address _accessor) 
        external 
        nonReentrant
        onlyRegisteredPatient
        notZeroAddress(_accessor)
    {
        address sender = _msgSender();
        
        if (!accessPermissions[sender][_accessor].isGranted) {
            revert AccessNotGranted();
        }

        // Revoke permission
        accessPermissions[sender][_accessor].isGranted = false;
        accessPermissions[sender][_accessor].expiresAt = block.timestamp;

        // Update last activity
        patientProfiles[sender].lastActivityTimestamp = block.timestamp;

        emit AccessRevoked(sender, _accessor, block.timestamp);
    }

    /**
     * @notice Checks if an accessor has valid (non-expired) access to patient data
     * @dev Public view function for hospitals/validators to verify access
     * @param _patient The patient's wallet address
     * @param _accessor The accessor's wallet address
     * @return hasAccess True if access is valid and not expired
     * @return accessDetails The full access permission details
     */
    function checkAccess(address _patient, address _accessor) 
        external 
        view 
        returns (bool hasAccess, AccessPermission memory accessDetails) 
    {
        accessDetails = accessPermissions[_patient][_accessor];
        
        // Check if access is granted and not expired
        hasAccess = accessDetails.isGranted && 
                    (accessDetails.expiresAt == 0 || accessDetails.expiresAt > block.timestamp);
        
        return (hasAccess, accessDetails);
    }

    /**
     * @notice Returns list of all addresses granted access by a patient
     * @dev Useful for patients to view who has access to their data
     * @param _patient The patient's wallet address
     * @return List of accessor addresses (may include revoked/expired)
     */
    function getGrantedAccessList(address _patient) 
        external 
        view 
        returns (address[] memory) 
    {
        return _grantedAccessList[_patient];
    }

    /**
     * @notice Returns list of all active (non-expired, non-revoked) accessors
     * @dev Filters out expired and revoked permissions
     * @param _patient The patient's wallet address
     * @return activeAccessors List of addresses with active access
     */
    function getActiveAccessors(address _patient) 
        external 
        view 
        returns (address[] memory) 
    {
        address[] memory allAccessors = _grantedAccessList[_patient];
        uint256 activeCount = 0;

        // First pass: count active accessors
        for (uint256 i = 0; i < allAccessors.length; i++) {
            AccessPermission memory perm = accessPermissions[_patient][allAccessors[i]];
            if (perm.isGranted && (perm.expiresAt == 0 || perm.expiresAt > block.timestamp)) {
                activeCount++;
            }
        }

        // Second pass: populate array
        address[] memory activeAccessors = new address[](activeCount);
        uint256 index = 0;
        for (uint256 i = 0; i < allAccessors.length; i++) {
            AccessPermission memory perm = accessPermissions[_patient][allAccessors[i]];
            if (perm.isGranted && (perm.expiresAt == 0 || perm.expiresAt > block.timestamp)) {
                activeAccessors[index] = allAccessors[i];
                index++;
            }
        }

        return activeAccessors;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // ACCESS REQUEST SYSTEM (QR Code Flow)
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * @notice Hospital requests access to a patient's data (called after scanning QR)
     * @dev Creates a pending access request that patient must approve
     * @param _patient The patient's wallet address (from QR code)
     * @param _hospitalName Name of the hospital for display
     * @param _accessDuration Requested access duration in seconds (0 = until revoked)
     * @param _message Optional message explaining why access is needed
     * 
     * Requirements:
     * - Patient must be registered
     * - Hospital must be whitelisted
     * - No existing pending request from this hospital
     * 
     * Emits:
     * - {AccessRequested} event
     */
    function requestAccess(
        address _patient,
        string calldata _hospitalName,
        uint256 _accessDuration,
        string calldata _message
    ) 
        external 
        nonReentrant
        notZeroAddress(_patient)
        onlyWhitelistedHospital(_msgSender())
    {
        address hospital = _msgSender();
        
        // Check patient is registered
        if (!patientProfiles[_patient].isRegistered) {
            revert PatientNotRegistered();
        }

        // Check no existing pending request from this hospital
        AccessRequest[] storage requests = _pendingAccessRequests[_patient];
        for (uint256 i = 0; i < requests.length; i++) {
            if (requests[i].hospitalAddress == hospital && requests[i].status == 0) {
                revert AccessRequestAlreadyPending();
            }
        }

        // Create new access request
        uint256 requestIndex = requests.length;
        requests.push(AccessRequest({
            hospitalAddress: hospital,
            hospitalName: _hospitalName,
            requestedAt: block.timestamp,
            accessDuration: _accessDuration,
            message: _message,
            status: 0 // Pending
        }));

        emit AccessRequested(_patient, hospital, _hospitalName, requestIndex, _accessDuration);
    }

    /**
     * @notice Patient approves an access request
     * @dev Grants access to the requesting hospital
     * @param _requestIndex Index of the request to approve
     * 
     * Requirements:
     * - Caller must be the patient
     * - Request must exist and be pending
     * 
     * Emits:
     * - {AccessRequestApproved} event
     * - {AccessGranted} event
     */
    function approveAccessRequest(uint256 _requestIndex) 
        external 
        nonReentrant
        onlyRegisteredPatient
    {
        address patient = _msgSender();
        AccessRequest[] storage requests = _pendingAccessRequests[patient];
        
        if (_requestIndex >= requests.length) {
            revert InvalidAccessRequestIndex();
        }
        
        AccessRequest storage request = requests[_requestIndex];
        
        if (request.status != 0) {
            revert AccessRequestNotPending();
        }

        // Update request status
        request.status = 1; // Approved

        // Calculate expiry
        uint256 expiresAt = request.accessDuration == 0 
            ? 0 
            : block.timestamp + request.accessDuration;

        // Grant access
        if (!accessPermissions[patient][request.hospitalAddress].isGranted) {
            _grantedAccessList[patient].push(request.hospitalAddress);
        }

        accessPermissions[patient][request.hospitalAddress] = AccessPermission({
            isGranted: true,
            expiresAt: expiresAt,
            grantedAt: block.timestamp,
            accessType: "FULL"
        });

        // Update last activity
        patientProfiles[patient].lastActivityTimestamp = block.timestamp;

        emit AccessRequestApproved(patient, request.hospitalAddress, _requestIndex);
        emit AccessGranted(patient, request.hospitalAddress, "FULL", expiresAt);
    }

    /**
     * @notice Patient rejects an access request
     * @dev Marks the request as rejected
     * @param _requestIndex Index of the request to reject
     * 
     * Requirements:
     * - Caller must be the patient
     * - Request must exist and be pending
     * 
     * Emits:
     * - {AccessRequestRejected} event
     */
    function rejectAccessRequest(uint256 _requestIndex) 
        external 
        nonReentrant
        onlyRegisteredPatient
    {
        address patient = _msgSender();
        AccessRequest[] storage requests = _pendingAccessRequests[patient];
        
        if (_requestIndex >= requests.length) {
            revert InvalidAccessRequestIndex();
        }
        
        AccessRequest storage request = requests[_requestIndex];
        
        if (request.status != 0) {
            revert AccessRequestNotPending();
        }

        // Update request status
        request.status = 2; // Rejected

        // Update last activity
        patientProfiles[patient].lastActivityTimestamp = block.timestamp;

        emit AccessRequestRejected(patient, request.hospitalAddress, _requestIndex);
    }

    /**
     * @notice Returns all pending access requests for a patient
     * @param _patient The patient's wallet address
     * @return requests Array of all access requests (including processed ones)
     */
    function getAccessRequests(address _patient) 
        external 
        view 
        returns (AccessRequest[] memory) 
    {
        return _pendingAccessRequests[_patient];
    }

    /**
     * @notice Returns only pending access requests for a patient
     * @param _patient The patient's wallet address
     * @return pendingRequests Array of pending access requests
     */
    function getPendingAccessRequests(address _patient) 
        external 
        view 
        returns (AccessRequest[] memory) 
    {
        AccessRequest[] memory allRequests = _pendingAccessRequests[_patient];
        uint256 pendingCount = 0;

        // First pass: count pending requests
        for (uint256 i = 0; i < allRequests.length; i++) {
            if (allRequests[i].status == 0) {
                pendingCount++;
            }
        }

        // Second pass: populate array
        AccessRequest[] memory pendingRequests = new AccessRequest[](pendingCount);
        uint256 index = 0;
        for (uint256 i = 0; i < allRequests.length; i++) {
            if (allRequests[i].status == 0) {
                pendingRequests[index] = allRequests[i];
                index++;
            }
        }

        return pendingRequests;
    }

    /**
     * @notice Returns the count of pending access requests for a patient
     * @param _patient The patient's wallet address
     * @return count Number of pending requests
     */
    function getPendingAccessRequestCount(address _patient) 
        external 
        view 
        returns (uint256 count) 
    {
        AccessRequest[] memory allRequests = _pendingAccessRequests[_patient];
        for (uint256 i = 0; i < allRequests.length; i++) {
            if (allRequests[i].status == 0) {
                count++;
            }
        }
        return count;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // MEDICAL RECORD REGISTRY (Patient View)
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * @notice Adds a new medical record reference for a patient
     * @dev Called by whitelisted hospitals after uploading encrypted data to IPFS. 
     *      Record status starts as unverified (pending validator approval).
     * @param _patient The patient's wallet address
     * @param _ipfsCid The IPFS Content Identifier of the encrypted data
     * @param _dataHash SHA-256 hash of the original data for integrity
     * @param _icd10Code ICD-10 disease classification code
     * @param _recordType Type of record (e.g., "DIAGNOSIS", "LAB_RESULT")
     * @return recordIndex The index of the newly added record
     * 
     * Requirements:
     * - Caller must be a whitelisted hospital
     * - Patient must be registered
     * - Data hash must be unique (no duplicates)
     * 
     * Emits:
     * - {RecordAdded} event
     */
    function addMedicalRecord(
        address _patient,
        string calldata _ipfsCid,
        bytes32 _dataHash,
        string calldata _icd10Code,
        string calldata _recordType
    ) 
        external 
        nonReentrant
        notZeroAddress(_patient)
        returns (uint256 recordIndex) 
    {
        address sender = _msgSender();
        
        // Verify hospital is authorized
        if (!_isHospitalAuthorized(sender)) {
            revert HospitalNotWhitelisted();
        }
        
        // Verify patient is registered
        if (!patientProfiles[_patient].isRegistered) {
            revert PatientNotRegistered();
        }

        // Check for duplicate records
        if (recordHashExists[_dataHash]) {
            revert DuplicateRecordHash();
        }

        // Mark hash as existing
        recordHashExists[_dataHash] = true;

        // Create new record reference
        MedicalRecordRef memory newRecord = MedicalRecordRef({
            ipfsCid: _ipfsCid,
            dataHash: _dataHash,
            hospitalAddress: sender,
            timestamp: block.timestamp,
            icd10Code: _icd10Code,
            recordType: _recordType,
            isVerified: false // Pending verification
        });

        // Add to patient's records
        _patientRecords[_patient].push(newRecord);
        recordIndex = _patientRecords[_patient].length - 1;

        // Update patient profile
        patientProfiles[_patient].totalRecords++;
        patientProfiles[_patient].lastActivityTimestamp = block.timestamp;

        emit RecordAdded(_patient, sender, _ipfsCid, recordIndex, _icd10Code);

        return recordIndex;
    }

    /**
     * @notice Marks a medical record as verified by validators
     * @dev Called by the validator system after successful verification
     * @param _patient The patient's wallet address
     * @param _recordIndex The index of the record to verify
     * 
     * Requirements:
     * - Caller must have ADMIN_ROLE (representing validator consensus)
     * - Record index must be valid
     * 
     * Emits:
     * - {RecordVerified} event
     */
    function verifyRecord(address _patient, uint256 _recordIndex) 
        external 
        nonReentrant
        onlyRole(ADMIN_ROLE)
    {
        if (_recordIndex >= _patientRecords[_patient].length) {
            revert InvalidRecordIndex();
        }

        _patientRecords[_patient][_recordIndex].isVerified = true;

        emit RecordVerified(_patient, _recordIndex, block.timestamp);
    }

    /**
     * @notice Gets all medical record references for a patient
     * @dev View function for patients to see their complete medical history
     * @param _patient The patient's wallet address
     * @return Array of MedicalRecordRef structs
     */
    function getPatientRecords(address _patient) 
        external 
        view 
        returns (MedicalRecordRef[] memory) 
    {
        return _patientRecords[_patient];
    }

    /**
     * @notice Gets a specific medical record by index
     * @param _patient The patient's wallet address
     * @param _recordIndex The index of the record
     * @return The MedicalRecordRef at the specified index
     */
    function getRecordByIndex(address _patient, uint256 _recordIndex) 
        external 
        view 
        returns (MedicalRecordRef memory) 
    {
        if (_recordIndex >= _patientRecords[_patient].length) {
            revert InvalidRecordIndex();
        }
        return _patientRecords[_patient][_recordIndex];
    }

    /**
     * @notice Gets the total number of records for a patient
     * @param _patient The patient's wallet address
     * @return The count of medical records
     */
    function getRecordCount(address _patient) 
        external 
        view 
        returns (uint256) 
    {
        return _patientRecords[_patient].length;
    }

    /**
     * @notice Gets records filtered by hospital address
     * @dev Useful for viewing records from a specific healthcare provider
     * @param _patient The patient's wallet address
     * @param _hospital The hospital address to filter by
     * @return filteredRecords Array of records from the specified hospital
     */
    function getRecordsByHospital(address _patient, address _hospital) 
        external 
        view 
        returns (MedicalRecordRef[] memory) 
    {
        MedicalRecordRef[] memory allRecords = _patientRecords[_patient];
        uint256 count = 0;

        // Count matching records
        for (uint256 i = 0; i < allRecords.length; i++) {
            if (allRecords[i].hospitalAddress == _hospital) {
                count++;
            }
        }

        // Populate filtered array
        MedicalRecordRef[] memory filteredRecords = new MedicalRecordRef[](count);
        uint256 index = 0;
        for (uint256 i = 0; i < allRecords.length; i++) {
            if (allRecords[i].hospitalAddress == _hospital) {
                filteredRecords[index] = allRecords[i];
                index++;
            }
        }

        return filteredRecords;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // HOSPITAL WHITELIST MANAGEMENT
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * @notice Adds a hospital to the whitelist
     * @dev Only admins can whitelist hospitals
     * @param _hospital The hospital's wallet address
     * @param _hospitalName The name/identifier of the hospital
     * 
     * Requirements:
     * - Caller must have ADMIN_ROLE
     * - Hospital address must not be zero
     * 
     * Emits:
     * - {HospitalWhitelisted} event
     */
    function whitelistHospital(address _hospital, string calldata _hospitalName) 
        external 
        onlyRole(ADMIN_ROLE)
        notZeroAddress(_hospital)
    {
        isWhitelistedHospital[_hospital] = true;
        _grantRole(HOSPITAL_ROLE, _hospital);

        emit HospitalWhitelisted(_hospital, _hospitalName);
    }

    /**
     * @notice Removes a hospital from the whitelist
     * @dev Only admins can remove hospitals from whitelist
     * @param _hospital The hospital's wallet address
     * 
     * Requirements:
     * - Caller must have ADMIN_ROLE
     * 
     * Emits:
     * - {HospitalRemovedFromWhitelist} event
     */
    function removeHospitalFromWhitelist(address _hospital) 
        external 
        onlyRole(ADMIN_ROLE)
    {
        isWhitelistedHospital[_hospital] = false;
        _revokeRole(HOSPITAL_ROLE, _hospital);

        emit HospitalRemovedFromWhitelist(_hospital);
    }

    /**
     * @notice Checks if a hospital is authorized (from local whitelist OR external registry)
     * @dev Public view function for external contracts/frontends to verify hospital status
     * @param _hospital The hospital address to check
     * @return True if hospital is authorized from any source
     */
    function isHospitalAuthorized(address _hospital) 
        external 
        view 
        returns (bool) 
    {
        return _isHospitalAuthorized(_hospital);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // SIGNATURE VERIFICATION (For Off-chain Authorization)
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * @notice Verifies that a message was signed by the patient
     * @dev Used for off-chain authorization verification (e.g., QR code scanning)
     * @param _patient The patient's wallet address
     * @param _messageHash The hash of the message that was signed
     * @param _signature The signature bytes
     * @return True if the signature is valid and from the patient
     */
    function verifyPatientSignature(
        address _patient,
        bytes32 _messageHash,
        bytes calldata _signature
    ) 
        external 
        view 
        returns (bool) 
    {
        bytes32 ethSignedMessageHash = _messageHash.toEthSignedMessageHash();
        address recoveredSigner = ethSignedMessageHash.recover(_signature);
        return recoveredSigner == _patient && patientProfiles[_patient].isRegistered;
    }

    /**
     * @notice Generates an access grant message hash for signing
     * @dev Frontend can use this to create the message for patient to sign
     * @param _patient The patient's address
     * @param _accessor The accessor's address
     * @param _accessType The type of access
     * @param _expiresAt The expiration timestamp
     * @param _nonce A unique nonce to prevent replay attacks
     * @return The message hash to be signed
     */
    function getAccessGrantMessageHash(
        address _patient,
        address _accessor,
        string calldata _accessType,
        uint256 _expiresAt,
        uint256 _nonce
    ) 
        external 
        pure 
        returns (bytes32) 
    {
        return keccak256(abi.encodePacked(
            _patient,
            _accessor,
            _accessType,
            _expiresAt,
            _nonce
        ));
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // VIEW FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * @notice Gets the complete patient profile
     * @param _patient The patient's wallet address
     * @return The PatientProfile struct
     */
    function getPatientProfile(address _patient) 
        external 
        view 
        returns (PatientProfile memory) 
    {
        return patientProfiles[_patient];
    }

    /**
     * @notice Gets the total number of registered patients
     * @return The current patient count
     */
    function getTotalPatients() 
        external 
        view 
        returns (uint256) 
    {
        return _patientIdCounter - 1; // Subtract 1 since counter starts at 1
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // ERC-2771 CONTEXT OVERRIDES (Required for Meta-Transaction Support)
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * @notice Override _msgSender to support meta-transactions
     * @dev Returns the actual sender when called via trusted forwarder
     * @return The original transaction sender
     */
    function _msgSender() 
        internal 
        view 
        virtual 
        override(Context, ERC2771Context) 
        returns (address) 
    {
        return ERC2771Context._msgSender();
    }

    /**
     * @notice Override _msgData to support meta-transactions  
     * @dev Returns the actual calldata when called via trusted forwarder
     * @return The original transaction calldata
     */
    function _msgData() 
        internal 
        view 
        virtual 
        override(Context, ERC2771Context) 
        returns (bytes calldata) 
    {
        return ERC2771Context._msgData();
    }

    /**
     * @notice Override _contextSuffixLength for ERC2771 support
     * @dev Required for proper calldata handling with trusted forwarder
     * @return The length of the context suffix (sender address = 20 bytes)
     */
    function _contextSuffixLength() 
        internal 
        view 
        virtual 
        override(Context, ERC2771Context) 
        returns (uint256) 
    {
        return ERC2771Context._contextSuffixLength();
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // INTERFACE SUPPORT
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * @notice Checks if the contract supports an interface
     * @dev Override required for AccessControl and ERC721 compatibility
     * @param interfaceId The interface identifier
     * @return True if the interface is supported
     */
    function supportsInterface(bytes4 interfaceId) 
        public 
        view 
        virtual 
        override(ERC721, AccessControl) 
        returns (bool) 
    {
        return super.supportsInterface(interfaceId);
    }
}
