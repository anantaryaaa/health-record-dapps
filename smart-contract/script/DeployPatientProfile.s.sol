// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/MedichainPatientProfile.sol";

/**
 * @title DeployPatientProfile
 * @notice Deployment script for MedichainPatientProfile contract
 * 
 * Usage:
 * forge script script/DeployPatientProfile.s.sol:DeployPatientProfile \
 *   --rpc-url $LISK_SEPOLIA_RPC \
 *   --private-key $PRIVATE_KEY \
 *   --broadcast \
 *   --verify
 * 
 * Environment Variables Required:
 * - PRIVATE_KEY: Deployer's private key
 * - LISK_SEPOLIA_RPC: RPC URL for Lisk Sepolia
 * 
 * Deployed Contract Addresses (Lisk Sepolia - Chain ID 4202):
 * - MedichainForwarder: 0xdd5479eD2519E5a5798A36228043882a2CCa699e
 * - MedichainPatientIdentity: 0x1a53bfCeB07674638F15bc18E2bA5D1C67f8349e
 */
contract DeployPatientProfile is Script {
    // Deployed contract addresses on Lisk Sepolia
    address constant PATIENT_IDENTITY_CONTRACT = 0x1a53bfCeB07674638F15bc18E2bA5D1C67f8349e;
    address constant TRUSTED_FORWARDER = 0xdd5479eD2519E5a5798A36228043882a2CCa699e;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        console.log("=== MedichainPatientProfile Deployment ===");
        console.log("Deployer:", deployer);
        console.log("Chain ID:", block.chainid);
        console.log("");
        console.log("Constructor Parameters:");
        console.log("  PatientIdentity:", PATIENT_IDENTITY_CONTRACT);
        console.log("  TrustedForwarder:", TRUSTED_FORWARDER);
        console.log("");

        vm.startBroadcast(deployerPrivateKey);

        MedichainPatientProfile profileContract = new MedichainPatientProfile(
            PATIENT_IDENTITY_CONTRACT,
            TRUSTED_FORWARDER
        );

        vm.stopBroadcast();

        console.log("=== Deployment Complete ===");
        console.log("MedichainPatientProfile deployed at:", address(profileContract));
        console.log("");
        console.log("Verification command:");
        console.log("forge verify-contract \\");
        console.log("  --chain-id 4202 \\");
        console.log("  --compiler-version v0.8.24 \\");
        console.log("  --constructor-args $(cast abi-encode 'constructor(address,address)'", PATIENT_IDENTITY_CONTRACT, TRUSTED_FORWARDER, ") \\");
        console.log("  ", address(profileContract), "\\");
        console.log("  src/MedichainPatientProfile.sol:MedichainPatientProfile");
    }
}

/**
 * @title DeployPatientProfileLocal
 * @notice Deployment script for local testing (anvil)
 * 
 * Usage:
 * anvil --fork-url $LISK_SEPOLIA_RPC
 * forge script script/DeployPatientProfile.s.sol:DeployPatientProfileLocal \
 *   --rpc-url http://localhost:8545 \
 *   --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 \
 *   --broadcast
 */
contract DeployPatientProfileLocal is Script {
    // Use real addresses for fork testing
    address constant PATIENT_IDENTITY_CONTRACT = 0x1a53bfCeB07674638F15bc18E2bA5D1C67f8349e;
    address constant TRUSTED_FORWARDER = 0xdd5479eD2519E5a5798A36228043882a2CCa699e;

    function run() external {
        // Anvil default private key
        uint256 deployerPrivateKey = 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80;
        address deployer = vm.addr(deployerPrivateKey);

        console.log("=== Local Deployment (Anvil) ===");
        console.log("Deployer:", deployer);
        console.log("");

        vm.startBroadcast(deployerPrivateKey);

        MedichainPatientProfile profileContract = new MedichainPatientProfile(
            PATIENT_IDENTITY_CONTRACT,
            TRUSTED_FORWARDER
        );

        vm.stopBroadcast();

        console.log("MedichainPatientProfile deployed at:", address(profileContract));
    }
}
