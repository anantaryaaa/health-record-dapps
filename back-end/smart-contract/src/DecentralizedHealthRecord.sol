// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title DecentralizedHealthRecord
 * @dev Core contract for managing decentralized health records with DID, record storage, and access control.
 */
contract DecentralizedHealthRecord {
    struct MedicalRecord {
        string dataHash; // Hash/encrypted reference to off-chain data
        address validator;
        uint256 timestamp;
    }

    // Mapping from patient address to their Decentralized ID (DID)
    mapping(address => string) public dids;
    // Mapping from patient address to their medical records
    mapping(address => MedicalRecord[]) private records;
    // Mapping from patient to (grantee => access permission)
    mapping(address => mapping(address => bool)) public permissions;
    // Mapping for validator addresses
    mapping(address => bool) public validators;
    // Owner/admin address
    address public owner;

    event DIDRegistered(address indexed patient, string did);
    event ValidatorAdded(address indexed validator);
    event ValidatorRemoved(address indexed validator);
    event RecordAdded(address indexed patient, string dataHash, address indexed validator);
    event PermissionGranted(address indexed patient, address indexed grantee);
    event PermissionRevoked(address indexed patient, address indexed grantee);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not contract owner");
        _;
    }

    modifier onlyValidator() {
        require(validators[msg.sender], "Not a validator");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    // Register or update DID for sender
    function registerDID(string calldata _did) external {
        dids[msg.sender] = _did;
        emit DIDRegistered(msg.sender, _did);
    }

    // Add a validator (only owner)
    function addValidator(address _validator) external onlyOwner {
        validators[_validator] = true;
        emit ValidatorAdded(_validator);
    }

    // Remove a validator (only owner)
    function removeValidator(address _validator) external onlyOwner {
        validators[_validator] = false;
        emit ValidatorRemoved(_validator);
    }

    // Add a medical record for a patient (only validator)
    function addMedicalRecord(address patient, string calldata dataHash) external onlyValidator {
        records[patient].push(MedicalRecord(dataHash, msg.sender, block.timestamp));
        emit RecordAdded(patient, dataHash, msg.sender);
    }

    // Grant access to a grantee (doctor/RS)
    function grantAccess(address grantee) external {
        permissions[msg.sender][grantee] = true;
        emit PermissionGranted(msg.sender, grantee);
    }

    // Revoke access from a grantee
    function revokeAccess(address grantee) external {
        permissions[msg.sender][grantee] = false;
        emit PermissionRevoked(msg.sender, grantee);
    }

    // Check if requester has access to patient's records
    function canAccess(address patient, address requester) public view returns (bool) {
        return (requester == patient) || permissions[patient][requester];
    }

    // Get all medical records for a patient (only if permitted)
    function getRecords(address patient) external view returns (MedicalRecord[] memory) {
        require(canAccess(patient, msg.sender), "No access to records");
        return records[patient];
    }

    // Get DID for a patient
    function getDID(address patient) external view returns (string memory) {
        return dids[patient];
    }
}
