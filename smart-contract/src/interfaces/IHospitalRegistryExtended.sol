// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title IHospitalRegistryExtended
 * @notice Extended interface for AutomatedHospitalRegistry contract
 * @dev Used by MedichainHospitalProfile to check hospital verification and get details
 */
interface IHospitalRegistryExtended {
    /**
     * @notice Check if a hospital is verified
     * @param hospital The hospital address to check
     * @return True if hospital is verified
     */
    function isHospitalVerified(address hospital) external view returns (bool);

    /**
     * @notice Get hospital details from registry
     * @param hospital The hospital address
     * @return name Hospital name
     * @return licenseNumber Government license number
     * @return wallet Hospital wallet address
     * @return isVerified Verification status
     */
    function getHospitalDetails(address hospital) external view returns (
        string memory name,
        string memory licenseNumber,
        address wallet,
        bool isVerified
    );
}
