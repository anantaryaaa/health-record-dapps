// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title ValidatorManagement
 * @dev Contract for managing validator registration, removal, and verification logging.
 */
contract ValidatorManagement {
    address public owner;
    mapping(address => bool) public validators;
    mapping(address => string) public validatorInfo; // Optional: store validator metadata (e.g., name, institution)

    event ValidatorAdded(address indexed validator, string info);
    event ValidatorRemoved(address indexed validator);
    event RecordVerified(address indexed validator, address indexed patient, string dataHash, uint256 timestamp);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

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

    // Transfer contract ownership
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "New owner is zero address");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    // Add a validator (only owner)
    function addValidator(address _validator, string calldata info) external onlyOwner {
        validators[_validator] = true;
        validatorInfo[_validator] = info;
        emit ValidatorAdded(_validator, info);
    }

    // Remove a validator (only owner)
    function removeValidator(address _validator) external onlyOwner {
        validators[_validator] = false;
        emit ValidatorRemoved(_validator);
    }

    // Log verification of a record (only validator)
    function verifyRecord(address patient, string calldata dataHash) external onlyValidator {
        emit RecordVerified(msg.sender, patient, dataHash, block.timestamp);
    }

    // Check if an address is a validator
    function isValidator(address _addr) external view returns (bool) {
        return validators[_addr];
    }

    // Get validator info
    function getValidatorInfo(address _validator) external view returns (string memory) {
        return validatorInfo[_validator];
    }
}
