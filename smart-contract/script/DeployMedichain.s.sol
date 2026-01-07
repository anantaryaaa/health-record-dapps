// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/MedichainPatientIdentity.sol";
import "../src/MedichainPatientProfile.sol";
import "../src/MedichainHospitalProfile.sol";
import "../src/AutomatedHospitalRegistry.sol";
import "../src/MedichainForwarder.sol";

/**
 * @title DeployMedichain
 * @notice Deployment script for Medichain smart contracts on Lisk Sepolia Testnet
 * @dev Run with: forge script script/DeployMedichain.s.sol:DeployMedichain --rpc-url $RPC_URL --broadcast --verify
 * 
 * This deployment includes:
 * 1. MedichainForwarder - ERC-2771 trusted forwarder for gasless transactions
 * 2. AutomatedHospitalRegistry - Hospital registration with signature verification
 * 3. MedichainPatientIdentity - Patient identity and medical records management
 * 4. MedichainPatientProfile - Encrypted patient profile storage
 * 5. MedichainHospitalProfile - Hospital profile storage
 */
contract DeployMedichain is Script {
    
    function run() external {
        // Load private key from environment
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        // Optional: Initial funding for forwarder (in wei)
        uint256 initialForwarderFunding = vm.envOr("FORWARDER_INITIAL_FUNDING", uint256(0));
        
        console.log("==============================================");
        console.log("MEDICHAIN DEPLOYMENT - LISK SEPOLIA TESTNET");
        console.log("==============================================");
        console.log("Deployer address:", deployer);
        console.log("Deployer balance:", deployer.balance);
        console.log("");

        vm.startBroadcast(deployerPrivateKey);

        // =====================================================================
        // 1. Deploy MedichainForwarder FIRST
        //    This enables gasless transactions for all contracts
        // =====================================================================
        console.log("Deploying MedichainForwarder...");
        MedichainForwarder forwarder = new MedichainForwarder(deployer);
        console.log("MedichainForwarder deployed at:", address(forwarder));

        // Fund the forwarder if initial funding is specified
        if (initialForwarderFunding > 0) {
            console.log("Funding forwarder with:", initialForwarderFunding, "wei");
            (bool success,) = address(forwarder).call{value: initialForwarderFunding}("");
            require(success, "Failed to fund forwarder");
        }

        // =====================================================================
        // 2. Deploy AutomatedHospitalRegistry
        //    The deployer will be the systemVerifier for signature validation
        // =====================================================================
        console.log("Deploying AutomatedHospitalRegistry...");
        AutomatedHospitalRegistry hospitalRegistry = new AutomatedHospitalRegistry(
            deployer,           // systemVerifier
            address(forwarder)  // trustedForwarder
        );
        console.log("AutomatedHospitalRegistry deployed at:", address(hospitalRegistry));

        // =====================================================================
        // 3. Deploy MedichainPatientIdentity with reference to HospitalRegistry
        // =====================================================================
        console.log("Deploying MedichainPatientIdentity...");
        MedichainPatientIdentity patientIdentity = new MedichainPatientIdentity(
            address(hospitalRegistry),  // hospitalRegistry
            address(forwarder)          // trustedForwarder
        );
        console.log("MedichainPatientIdentity deployed at:", address(patientIdentity));

        // =====================================================================
        // 4. Deploy MedichainPatientProfile with reference to PatientIdentity
        // =====================================================================
        console.log("Deploying MedichainPatientProfile...");
        MedichainPatientProfile patientProfile = new MedichainPatientProfile(
            address(patientIdentity),   // patientIdentityContract
            address(forwarder)          // trustedForwarder
        );
        console.log("MedichainPatientProfile deployed at:", address(patientProfile));

        // =====================================================================
        // 5. Deploy MedichainHospitalProfile with reference to HospitalRegistry
        // =====================================================================
        console.log("Deploying MedichainHospitalProfile...");
        MedichainHospitalProfile hospitalProfile = new MedichainHospitalProfile(
            address(hospitalRegistry),  // hospitalRegistry
            address(forwarder)          // trustedForwarder
        );
        console.log("MedichainHospitalProfile deployed at:", address(hospitalProfile));

        vm.stopBroadcast();

        // =====================================================================
        // Summary
        // =====================================================================
        console.log("");
        console.log("==============================================");
        console.log("DEPLOYMENT COMPLETE!");
        console.log("==============================================");
        console.log("Network: Lisk Sepolia Testnet (Chain ID: 4202)");
        console.log("");
        console.log("Contract Addresses:");
        console.log("  MedichainForwarder:        ", address(forwarder));
        console.log("  AutomatedHospitalRegistry: ", address(hospitalRegistry));
        console.log("  MedichainPatientIdentity:  ", address(patientIdentity));
        console.log("  MedichainPatientProfile:   ", address(patientProfile));
        console.log("  MedichainHospitalProfile:  ", address(hospitalProfile));
        console.log("");
        console.log("System Verifier (for hospital signatures):", deployer);
        console.log("Forwarder Owner (can fund/withdraw):", deployer);
        console.log("Forwarder Balance:", address(forwarder).balance);
        console.log("");
        console.log("==============================================");
        console.log("GASLESS TRANSACTIONS ENABLED!");
        console.log("==============================================");
        console.log("");
        console.log("Next Steps:");
        console.log("  1. Fund the forwarder: cast send", address(forwarder), "--value 1ether");
        console.log("  2. Update backend .env with contract addresses");
        console.log("  3. Setup relayer service to forward meta-transactions");
        console.log("  4. Whitelist hospitals using whitelistHospital()");
        console.log("  5. Test gasless patient registration flow");
        console.log("==============================================");
    }
}

/**
 * @title DeployPatientIdentityOnly
 * @notice Deploy only the MedichainPatientIdentity contract
 */
contract DeployPatientIdentityOnly is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address hospitalRegistryAddr = vm.envOr("HOSPITAL_REGISTRY_ADDRESS", address(0));
        address forwarderAddr = vm.envAddress("FORWARDER_ADDRESS");
        
        vm.startBroadcast(deployerPrivateKey);
        
        MedichainPatientIdentity patientIdentity = new MedichainPatientIdentity(
            hospitalRegistryAddr,
            forwarderAddr
        );
        console.log("MedichainPatientIdentity deployed at:", address(patientIdentity));
        console.log("Hospital Registry linked to:", hospitalRegistryAddr);
        console.log("Trusted Forwarder:", forwarderAddr);
        
        vm.stopBroadcast();
    }
}

/**
 * @title DeployHospitalRegistryOnly  
 * @notice Deploy only the AutomatedHospitalRegistry contract
 */
contract DeployHospitalRegistryOnly is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        address forwarderAddr = vm.envAddress("FORWARDER_ADDRESS");
        
        vm.startBroadcast(deployerPrivateKey);
        
        AutomatedHospitalRegistry hospitalRegistry = new AutomatedHospitalRegistry(
            deployer,
            forwarderAddr
        );
        console.log("AutomatedHospitalRegistry deployed at:", address(hospitalRegistry));
        console.log("System Verifier set to:", deployer);
        console.log("Trusted Forwarder:", forwarderAddr);
        
        vm.stopBroadcast();
    }
}

/**
 * @title DeployForwarderOnly  
 * @notice Deploy only the MedichainForwarder contract
 */
contract DeployForwarderOnly is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        uint256 initialFunding = vm.envOr("FORWARDER_INITIAL_FUNDING", uint256(0.1 ether));
        
        vm.startBroadcast(deployerPrivateKey);
        
        MedichainForwarder forwarder = new MedichainForwarder(deployer);
        console.log("MedichainForwarder deployed at:", address(forwarder));
        console.log("Owner set to:", deployer);
        
        // Fund the forwarder
        if (initialFunding > 0 && deployer.balance >= initialFunding) {
            (bool success,) = address(forwarder).call{value: initialFunding}("");
            if (success) {
                console.log("Forwarder funded with:", initialFunding);
            }
        }
        
        vm.stopBroadcast();
    }
}

/**
 * @title FundForwarder
 * @notice Fund an existing forwarder contract
 */
contract FundForwarder is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address forwarderAddr = vm.envAddress("FORWARDER_ADDRESS");
        uint256 fundAmount = vm.envOr("FUND_AMOUNT", uint256(0.5 ether));
        
        vm.startBroadcast(deployerPrivateKey);
        
        (bool success,) = forwarderAddr.call{value: fundAmount}("");
        require(success, "Failed to fund forwarder");
        
        console.log("Funded forwarder at:", forwarderAddr);
        console.log("Amount:", fundAmount);
        console.log("New balance:", forwarderAddr.balance);
        
        vm.stopBroadcast();
    }
}
