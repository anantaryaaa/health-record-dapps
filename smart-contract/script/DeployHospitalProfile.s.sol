// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/MedichainHospitalProfile.sol";

/**
 * @title DeployHospitalProfile
 * @notice Deployment script for MedichainHospitalProfile contract
 * 
 * Usage:
 * forge script script/DeployHospitalProfile.s.sol:DeployHospitalProfile \
 *   --rpc-url https://rpc.sepolia-api.lisk.com \
 *   --private-key $PRIVATE_KEY \
 *   --broadcast
 * 
 * Deployed Contract Addresses (Lisk Sepolia - Chain ID 4202):
 * - MedichainForwarder: 0xdd5479eD2519E5a5798A36228043882a2CCa699e
 * - AutomatedHospitalRegistry: 0x24F2939Daa1e8A5503d7185d9C3d141C8b5Ab589
 */
contract DeployHospitalProfile is Script {
    // Deployed contract addresses on Lisk Sepolia
    address constant HOSPITAL_REGISTRY_CONTRACT = 0x24F2939Daa1e8A5503d7185d9C3d141C8b5Ab589;
    address constant TRUSTED_FORWARDER = 0xdd5479eD2519E5a5798A36228043882a2CCa699e;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        console.log("=== MedichainHospitalProfile Deployment ===");
        console.log("Deployer:", deployer);
        console.log("Chain ID:", block.chainid);
        console.log("");
        console.log("Constructor Parameters:");
        console.log("  HospitalRegistry:", HOSPITAL_REGISTRY_CONTRACT);
        console.log("  TrustedForwarder:", TRUSTED_FORWARDER);
        console.log("");

        vm.startBroadcast(deployerPrivateKey);

        MedichainHospitalProfile profileContract = new MedichainHospitalProfile(
            HOSPITAL_REGISTRY_CONTRACT,
            TRUSTED_FORWARDER
        );

        vm.stopBroadcast();

        console.log("=== Deployment Complete ===");
        console.log("MedichainHospitalProfile deployed at:", address(profileContract));
        console.log("");
        console.log("Verification command:");
        console.log("forge verify-contract \\");
        console.log("  --chain-id 4202 \\");
        console.log("  --compiler-version v0.8.24 \\");
        console.log("  --constructor-args $(cast abi-encode 'constructor(address,address)'", HOSPITAL_REGISTRY_CONTRACT, TRUSTED_FORWARDER, ") \\");
        console.log("  ", address(profileContract), "\\");
        console.log("  src/MedichainHospitalProfile.sol:MedichainHospitalProfile");
    }
}
