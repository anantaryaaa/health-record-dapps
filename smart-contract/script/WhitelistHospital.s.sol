// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/MedichainPatientIdentity.sol";

/**
 * @title WhitelistHospital
 * @notice Script to whitelist a hospital in MedichainPatientIdentity
 * @dev Run with environment variables:
 *      PATIENT_IDENTITY_ADDRESS=0x... HOSPITAL_ADDRESS=0x... HOSPITAL_NAME="RS Example" \
 *      forge script script/WhitelistHospital.s.sol:WhitelistHospital --rpc-url $RPC_URL --broadcast
 */
contract WhitelistHospital is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address patientIdentityAddress = vm.envAddress("PATIENT_IDENTITY_ADDRESS");
        address hospitalAddress = vm.envAddress("HOSPITAL_ADDRESS");
        string memory hospitalName = vm.envString("HOSPITAL_NAME");

        console.log("Whitelisting hospital...");
        console.log("Patient Identity Contract:", patientIdentityAddress);
        console.log("Hospital Address:", hospitalAddress);
        console.log("Hospital Name:", hospitalName);

        vm.startBroadcast(deployerPrivateKey);

        MedichainPatientIdentity patientIdentity = MedichainPatientIdentity(patientIdentityAddress);
        patientIdentity.whitelistHospital(hospitalAddress, hospitalName);

        vm.stopBroadcast();

        console.log("Hospital whitelisted successfully!");
    }
}
