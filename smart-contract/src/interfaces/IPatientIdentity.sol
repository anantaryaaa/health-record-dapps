// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title IPatientIdentity
 * @author Medichain Development Team
 * @notice Interface for MedichainPatientIdentity contract
 * @dev Used by MedichainPatientProfile for access control verification
 */
interface IPatientIdentity {
    /**
     * @notice Access permission structure
     * @param isGranted Whether access is currently granted
     * @param expiresAt Unix timestamp when access expires (0 = permanent until revoked)
     * @param grantedAt Unix timestamp when access was granted
     * @param accessType Type of access (e.g., "FULL", "READ_ONLY")
     */
    struct AccessPermission {
        bool isGranted;
        uint256 expiresAt;
        uint256 grantedAt;
        string accessType;
    }

    /**
     * @notice Check if a wallet has a registered patient identity
     * @param wallet The wallet address to check
     * @return True if the wallet has a patient identity NFT
     */
    function hasPatientIdentity(address wallet) external view returns (bool);

    /**
     * @notice Check if an accessor has valid access to a patient's data
     * @param patient The patient's wallet address
     * @param accessor The accessor's wallet address (hospital/provider)
     * @return hasAccess True if access is valid and not expired
     * @return accessDetails The full access permission details
     */
    function checkAccess(address patient, address accessor) 
        external 
        view 
        returns (bool hasAccess, AccessPermission memory accessDetails);
}
