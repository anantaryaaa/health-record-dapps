/**
 * Medichain Relayer Service
 * 
 * This service handles gasless meta-transactions for the Medichain platform.
 * It receives signed requests from patients/hospitals and forwards them to
 * the blockchain, paying for gas fees on their behalf.
 * 
 * @author Medichain Development Team
 * @version 1.0.0
 */

require('dotenv').config();
const express = require('express');
const { ethers } = require('ethers');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

const config = {
    // Network settings
    RPC_URL: process.env.RPC_URL || 'https://rpc.sepolia-api.lisk.com',
    CHAIN_ID: parseInt(process.env.CHAIN_ID || '4202'),
    
    // Contract addresses (set after deployment)
    FORWARDER_ADDRESS: process.env.FORWARDER_ADDRESS,
    PATIENT_IDENTITY_ADDRESS: process.env.PATIENT_IDENTITY_ADDRESS,
    HOSPITAL_REGISTRY_ADDRESS: process.env.HOSPITAL_REGISTRY_ADDRESS,
    
    // Relayer wallet (this wallet pays for gas)
    RELAYER_PRIVATE_KEY: process.env.RELAYER_PRIVATE_KEY,
    
    // Server settings
    PORT: process.env.RELAYER_PORT || 3001,
    
    // Rate limiting
    MAX_GAS_PER_TX: 1000000,
    DAILY_GAS_LIMIT: 10000000,
};

// ═══════════════════════════════════════════════════════════════════════════
// ABIs (Simplified for meta-transaction handling)
// ═══════════════════════════════════════════════════════════════════════════

const FORWARDER_ABI = [
    "function execute((address from, address to, uint256 value, uint256 gas, uint256 nonce, uint48 deadline, bytes data) request, bytes signature) public payable returns (bool success)",
    "function verify((address from, address to, uint256 value, uint256 gas, uint256 nonce, uint48 deadline, bytes data) request, bytes signature) public view returns (bool)",
    "function nonces(address owner) public view returns (uint256)",
    "function getBalance() external view returns (uint256)",
    "function getStats() external view returns (uint256, uint256, uint256, bool)",
    "event RelayerFunded(address indexed funder, uint256 amount)",
];

const PATIENT_IDENTITY_ABI = [
    // View functions
    "function hasPatientIdentity(address wallet) external view returns (bool)",
    "function getPatientId(address wallet) external view returns (uint256)",
    "function checkAccess(address patient, address accessor) external view returns (bool hasAccess, tuple(bool isGranted, uint256 expiresAt, uint256 grantedAt, string accessType) accessDetails)",
    "function isHospitalAuthorized(address hospital) external view returns (bool)",
    "function isTrustedForwarder(address forwarder) external view returns (bool)",
    
    // State-changing functions (these can be called via meta-tx)
    "function grantAccess(address accessor, string accessType, uint256 expiresAt) external",
    "function revokeAccess(address accessor) external",
];

const HOSPITAL_REGISTRY_ABI = [
    "function registerHospital(string name, string licenseNumber, bytes signature) external",
    "function isHospitalVerified(address hospital) external view returns (bool)",
    "function isTrustedForwarder(address forwarder) external view returns (bool)",
];

// ═══════════════════════════════════════════════════════════════════════════
// SETUP
// ═══════════════════════════════════════════════════════════════════════════

let provider;
let relayerWallet;
let forwarderContract;
let patientIdentityContract;
let hospitalRegistryContract;

function setupContracts() {
    provider = new ethers.JsonRpcProvider(config.RPC_URL);
    relayerWallet = new ethers.Wallet(config.RELAYER_PRIVATE_KEY, provider);
    
    forwarderContract = new ethers.Contract(
        config.FORWARDER_ADDRESS,
        FORWARDER_ABI,
        relayerWallet
    );
    
    patientIdentityContract = new ethers.Contract(
        config.PATIENT_IDENTITY_ADDRESS,
        PATIENT_IDENTITY_ABI,
        provider
    );
    
    hospitalRegistryContract = new ethers.Contract(
        config.HOSPITAL_REGISTRY_ADDRESS,
        HOSPITAL_REGISTRY_ABI,
        provider
    );
    
    console.log('Contracts initialized:');
    console.log('  Forwarder:', config.FORWARDER_ADDRESS);
    console.log('  PatientIdentity:', config.PATIENT_IDENTITY_ADDRESS);
    console.log('  HospitalRegistry:', config.HOSPITAL_REGISTRY_ADDRESS);
    console.log('  Relayer Address:', relayerWallet.address);
}

// ═══════════════════════════════════════════════════════════════════════════
// EIP-712 TYPED DATA STRUCTURE
// ═══════════════════════════════════════════════════════════════════════════

const ForwardRequestType = {
    ForwardRequest: [
        { name: 'from', type: 'address' },
        { name: 'to', type: 'address' },
        { name: 'value', type: 'uint256' },
        { name: 'gas', type: 'uint256' },
        { name: 'nonce', type: 'uint256' },
        { name: 'deadline', type: 'uint48' },
        { name: 'data', type: 'bytes' },
    ],
};

function getDomain() {
    return {
        name: 'MedichainForwarder',
        version: '1',
        chainId: config.CHAIN_ID,
        verifyingContract: config.FORWARDER_ADDRESS,
    };
}

// ═══════════════════════════════════════════════════════════════════════════
// API ENDPOINTS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Health check endpoint
 */
app.get('/health', async (req, res) => {
    try {
        const balance = await provider.getBalance(relayerWallet.address);
        const forwarderBalance = await forwarderContract.getBalance();
        
        res.json({
            status: 'healthy',
            relayer: relayerWallet.address,
            relayerBalance: ethers.formatEther(balance),
            forwarderBalance: ethers.formatEther(forwarderBalance),
            chainId: config.CHAIN_ID,
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * Get nonce for a user
 * Frontend calls this before creating a meta-transaction
 */
app.get('/nonce/:address', async (req, res) => {
    try {
        const { address } = req.params;
        const nonce = await forwarderContract.nonces(address);
        res.json({ nonce: nonce.toString() });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * Get EIP-712 domain for signing
 * Frontend needs this to construct the typed data for signing
 */
app.get('/domain', (req, res) => {
    res.json({
        domain: getDomain(),
        types: ForwardRequestType,
    });
});

/**
 * Relay a signed meta-transaction
 * This is the main endpoint that processes gasless transactions
 * 
 * Expected body:
 * {
 *   request: {
 *     from: "0x...",      // User's address
 *     to: "0x...",        // Target contract (PatientIdentity or HospitalRegistry)
 *     value: "0",         // ETH value (usually 0)
 *     gas: "500000",      // Gas limit for the call
 *     nonce: "0",         // User's nonce from forwarder
 *     deadline: 1735689600, // Unix timestamp deadline
 *     data: "0x..."       // Encoded function call
 *   },
 *   signature: "0x..."    // User's EIP-712 signature
 * }
 */
app.post('/relay', async (req, res) => {
    try {
        const { request, signature } = req.body;
        
        // Validate request
        if (!request || !signature) {
            return res.status(400).json({ error: 'Missing request or signature' });
        }
        
        // Check deadline hasn't passed
        const currentTime = Math.floor(Date.now() / 1000);
        if (request.deadline <= currentTime) {
            return res.status(400).json({ error: 'Request deadline has passed' });
        }
        
        // Check gas limit
        if (parseInt(request.gas) > config.MAX_GAS_PER_TX) {
            return res.status(400).json({ error: 'Gas limit too high' });
        }
        
        // Verify the signature first
        const isValid = await forwarderContract.verify(request, signature);
        if (!isValid) {
            return res.status(400).json({ error: 'Invalid signature' });
        }
        
        console.log(`Relaying tx from ${request.from} to ${request.to}`);
        
        // Execute the meta-transaction
        const tx = await forwarderContract.execute(request, signature, {
            gasLimit: parseInt(request.gas) + 100000, // Add buffer for forwarder overhead
        });
        
        console.log(`Transaction sent: ${tx.hash}`);
        
        // Wait for confirmation
        const receipt = await tx.wait();
        
        console.log(`Transaction confirmed in block ${receipt.blockNumber}`);
        
        res.json({
            success: true,
            transactionHash: receipt.hash,
            blockNumber: receipt.blockNumber,
            gasUsed: receipt.gasUsed.toString(),
        });
        
    } catch (error) {
        console.error('Relay error:', error);
        res.status(500).json({ 
            error: error.message,
            reason: error.reason || 'Unknown error',
        });
    }
});

/**
 * Helper endpoint: Encode function call data
 * This helps frontend developers encode function calls correctly
 */
app.post('/encode', async (req, res) => {
    try {
        const { contract, functionName, args } = req.body;
        
        let contractInstance;
        if (contract === 'patientIdentity') {
            contractInstance = patientIdentityContract;
        } else if (contract === 'hospitalRegistry') {
            contractInstance = hospitalRegistryContract;
        } else {
            return res.status(400).json({ error: 'Unknown contract' });
        }
        
        const data = contractInstance.interface.encodeFunctionData(functionName, args);
        
        res.json({ data });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ═══════════════════════════════════════════════════════════════════════════
// STARTUP
// ═══════════════════════════════════════════════════════════════════════════

async function start() {
    // Validate configuration
    if (!config.FORWARDER_ADDRESS || !config.RELAYER_PRIVATE_KEY) {
        console.error('Missing required environment variables!');
        console.error('Required: FORWARDER_ADDRESS, RELAYER_PRIVATE_KEY');
        console.error('Optional: PATIENT_IDENTITY_ADDRESS, HOSPITAL_REGISTRY_ADDRESS');
        process.exit(1);
    }
    
    setupContracts();
    
    // Check relayer balance
    const balance = await provider.getBalance(relayerWallet.address);
    console.log(`Relayer balance: ${ethers.formatEther(balance)} ETH`);
    
    if (balance < ethers.parseEther('0.01')) {
        console.warn('⚠️  WARNING: Relayer balance is low! Fund the relayer wallet.');
    }
    
    app.listen(config.PORT, () => {
        console.log(`\n🚀 Medichain Relayer Service running on port ${config.PORT}`);
        console.log(`   Health check: http://localhost:${config.PORT}/health`);
        console.log(`   Relay endpoint: http://localhost:${config.PORT}/relay`);
    });
}

start().catch(console.error);

module.exports = app;
