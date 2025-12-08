// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title PermissionAccessControl
 * @dev Contract for managing access permissions to health records in a modular way.
 */
contract PermissionAccessControl {
    // Mapping from patient to (grantee => access permission)
    mapping(address => mapping(address => bool)) private permissions;
    // Owner/admin address
    address public owner;

    event PermissionGranted(address indexed patient, address indexed grantee);
    event PermissionRevoked(address indexed patient, address indexed grantee);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not contract owner");
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

    // Get permission status for a grantee
    function hasPermission(address patient, address grantee) external view returns (bool) {
        return permissions[patient][grantee];
    }
}
