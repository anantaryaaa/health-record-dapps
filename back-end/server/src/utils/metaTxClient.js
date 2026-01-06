/**
 * Medichain Meta-Transaction Client Library
 * 
 * This library provides helper functions for frontend applications
 * to create and send gasless meta-transactions.
 * 
 * @author Medichain Development Team
 * @version 1.0.0
 */

const { ethers } = require('ethers');

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

const DEFAULT_CONFIG = {
    RELAYER_URL: process.env.RELAYER_URL || 'http://localhost:3001',
    CHAIN_ID: parseInt(process.env.CHAIN_ID || '4202'),
    FORWARDER_ADDRESS: process.env.FORWARDER_ADDRESS,
    PATIENT_IDENTITY_ADDRESS: process.env.PATIENT_IDENTITY_ADDRESS,
    HOSPITAL_REGISTRY_ADDRESS: process.env.HOSPITAL_REGISTRY_ADDRESS,
};

// ═══════════════════════════════════════════════════════════════════════════
// EIP-712 TYPES
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

// ═══════════════════════════════════════════════════════════════════════════
// CONTRACT ABIs (Minimal for encoding)
// ═══════════════════════════════════════════════════════════════════════════

const PATIENT_IDENTITY_ABI = [
    "function grantAccess(address accessor, string accessType, uint256 expiresAt) external",
    "function revokeAccess(address accessor) external",
    "function mintIdentity(address patientWallet) external returns (uint256)",
    "function addMedicalRecord(address patient, string ipfsCid, bytes32 dataHash, string icd10Code, string recordType) external returns (uint256)",
];

const HOSPITAL_REGISTRY_ABI = [
    "function registerHospital(string name, string licenseNumber, bytes signature) external",
];

// ═══════════════════════════════════════════════════════════════════════════
// META-TRANSACTION CLIENT
// ═══════════════════════════════════════════════════════════════════════════

class MetaTxClient {
    /**
     * @param {object} config - Configuration object
     * @param {ethers.Signer} signer - User's signer (from wallet)
     */
    constructor(config, signer) {
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.signer = signer;
        
        // Initialize contract interfaces for encoding
        this.patientIdentityInterface = new ethers.Interface(PATIENT_IDENTITY_ABI);
        this.hospitalRegistryInterface = new ethers.Interface(HOSPITAL_REGISTRY_ABI);
    }
    
    /**
     * Get the EIP-712 domain for signing
     */
    getDomain() {
        return {
            name: 'MedichainForwarder',
            version: '1',
            chainId: this.config.CHAIN_ID,
            verifyingContract: this.config.FORWARDER_ADDRESS,
        };
    }
    
    /**
     * Get the current nonce for a user from the relayer
     * @param {string} address - User's address
     */
    async getNonce(address) {
        const response = await fetch(`${this.config.RELAYER_URL}/nonce/${address}`);
        const data = await response.json();
        return BigInt(data.nonce);
    }
    
    /**
     * Create and sign a forward request
     * @param {string} to - Target contract address
     * @param {string} data - Encoded function call data
     * @param {number} gas - Gas limit for the call
     * @param {number} deadlineSeconds - Seconds from now until deadline (default 1 hour)
     */
    async createSignedRequest(to, data, gas = 500000, deadlineSeconds = 3600) {
        const from = await this.signer.getAddress();
        const nonce = await this.getNonce(from);
        const deadline = Math.floor(Date.now() / 1000) + deadlineSeconds;
        
        const request = {
            from,
            to,
            value: 0n,
            gas: BigInt(gas),
            nonce,
            deadline,
            data,
        };
        
        // Sign the request using EIP-712
        const signature = await this.signer.signTypedData(
            this.getDomain(),
            ForwardRequestType,
            request
        );
        
        return { request, signature };
    }
    
    /**
     * Send a signed request to the relayer
     * @param {object} signedRequest - { request, signature }
     */
    async relay(signedRequest) {
        const response = await fetch(`${this.config.RELAYER_URL}/relay`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                request: {
                    from: signedRequest.request.from,
                    to: signedRequest.request.to,
                    value: signedRequest.request.value.toString(),
                    gas: signedRequest.request.gas.toString(),
                    nonce: signedRequest.request.nonce.toString(),
                    deadline: signedRequest.request.deadline,
                    data: signedRequest.request.data,
                },
                signature: signedRequest.signature,
            }),
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Relay failed');
        }
        
        return response.json();
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    // HIGH-LEVEL HELPER FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════
    
    /**
     * Grant access to a hospital/doctor (gasless)
     * @param {string} accessor - Hospital/doctor address
     * @param {string} accessType - Type of access (e.g., "FULL", "READ_ONLY")
     * @param {number} expiresAt - Unix timestamp when access expires (0 = permanent)
     */
    async grantAccess(accessor, accessType, expiresAt = 0) {
        const data = this.patientIdentityInterface.encodeFunctionData('grantAccess', [
            accessor,
            accessType,
            expiresAt,
        ]);
        
        const signedRequest = await this.createSignedRequest(
            this.config.PATIENT_IDENTITY_ADDRESS,
            data,
            200000
        );
        
        return this.relay(signedRequest);
    }
    
    /**
     * Revoke access from a hospital/doctor (gasless)
     * @param {string} accessor - Hospital/doctor address to revoke
     */
    async revokeAccess(accessor) {
        const data = this.patientIdentityInterface.encodeFunctionData('revokeAccess', [
            accessor,
        ]);
        
        const signedRequest = await this.createSignedRequest(
            this.config.PATIENT_IDENTITY_ADDRESS,
            data,
            150000
        );
        
        return this.relay(signedRequest);
    }
    
    /**
     * Add a medical record (for hospitals, gasless)
     * @param {string} patient - Patient's address
     * @param {string} ipfsCid - IPFS Content ID
     * @param {string} dataHash - Hash of the original data
     * @param {string} icd10Code - ICD-10 disease code
     * @param {string} recordType - Type of record
     */
    async addMedicalRecord(patient, ipfsCid, dataHash, icd10Code, recordType) {
        const data = this.patientIdentityInterface.encodeFunctionData('addMedicalRecord', [
            patient,
            ipfsCid,
            dataHash,
            icd10Code,
            recordType,
        ]);
        
        const signedRequest = await this.createSignedRequest(
            this.config.PATIENT_IDENTITY_ADDRESS,
            data,
            300000
        );
        
        return this.relay(signedRequest);
    }
    
    /**
     * Register a hospital (gasless)
     * @param {string} name - Hospital name
     * @param {string} licenseNumber - Government license number
     * @param {string} signature - Backend signature for verification
     */
    async registerHospital(name, licenseNumber, signature) {
        const data = this.hospitalRegistryInterface.encodeFunctionData('registerHospital', [
            name,
            licenseNumber,
            signature,
        ]);
        
        const signedRequest = await this.createSignedRequest(
            this.config.HOSPITAL_REGISTRY_ADDRESS,
            data,
            300000
        );
        
        return this.relay(signedRequest);
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// USAGE EXAMPLE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Example usage:
 * 
 * ```javascript
 * // In your frontend application
 * const { BrowserProvider } = require('ethers');
 * 
 * async function grantAccessGasless() {
 *     // Get signer from user's wallet (MetaMask, etc.)
 *     const provider = new BrowserProvider(window.ethereum);
 *     const signer = await provider.getSigner();
 *     
 *     // Create meta-tx client
 *     const client = new MetaTxClient({
 *         FORWARDER_ADDRESS: '0x...',
 *         PATIENT_IDENTITY_ADDRESS: '0x...',
 *         RELAYER_URL: 'http://localhost:3001',
 *     }, signer);
 *     
 *     // Grant access without paying gas!
 *     const result = await client.grantAccess(
 *         '0xHospitalAddress...',
 *         'FULL',
 *         0 // permanent
 *     );
 *     
 *     console.log('Transaction hash:', result.transactionHash);
 * }
 * ```
 */

module.exports = { MetaTxClient };
