/**
 * Blockchain Service for Medichain
 * Handles interactions with smart contracts on Lisk Sepolia
 */

import { prepareContractCall, readContract, sendTransaction, defineChain } from "thirdweb";
import { type Account } from "thirdweb/wallets";
import { getContract } from "thirdweb";
import { client } from "@/lib/thirdWeb";
import { CONTRACT_ADDRESSES, CHAIN_CONFIG } from "@/lib/contracts/config";

// Define chain for thirdweb
const liskSepolia = defineChain({
  id: CHAIN_CONFIG.chainId,
  name: CHAIN_CONFIG.name,
  rpc: CHAIN_CONFIG.rpcUrl,
  nativeCurrency: CHAIN_CONFIG.nativeCurrency,
  blockExplorers: [
    {
      name: "Lisk Explorer",
      url: CHAIN_CONFIG.blockExplorer,
    },
  ],
});

// Get contract instances
const getPatientIdentityContract = () =>
  getContract({
    client,
    chain: liskSepolia,
    address: CONTRACT_ADDRESSES.patientIdentity,
  });

const getHospitalRegistryContract = () =>
  getContract({
    client,
    chain: liskSepolia,
    address: CONTRACT_ADDRESSES.hospitalRegistry,
  });

// ============ TYPE DEFINITIONS ============

export interface PatientProfile {
  isRegistered: boolean;
  registrationTimestamp: number;
  totalRecords: number;
  lastActivityTimestamp: number;
}

export interface MedicalRecordRef {
  ipfsCid: string;
  dataHash: string;
  hospitalAddress: string;
  timestamp: number;
  icd10Code: string;
  recordType: string;
  isVerified: boolean;
}

export interface AccessPermission {
  isGranted: boolean;
  expiresAt: number;
  grantedAt: number;
  accessType: string;
}

export interface AccessRequest {
  hospitalAddress: string;
  hospitalName: string;
  requestedAt: number;
  accessDuration: number;
  message: string;
  status: number; // 0=Pending, 1=Approved, 2=Rejected
}

export interface HospitalInfo {
  name: string;
  licenseNumber: string;
  wallet: string;
  isVerified: boolean;
}

// ============ READ FUNCTIONS ============

/**
 * Check if an address has a patient identity
 */
export async function hasPatientIdentity(address: string): Promise<boolean> {
  try {
    const contract = getPatientIdentityContract();
    const result = await readContract({
      contract,
      method: "function hasPatientIdentity(address _wallet) view returns (bool)",
      params: [address],
    });
    return result as boolean;
  } catch (error) {
    console.error("Error checking patient identity:", error);
    return false;
  }
}

/**
 * Get patient profile
 */
export async function getPatientProfile(address: string): Promise<PatientProfile | null> {
  try {
    const contract = getPatientIdentityContract();
    const result = await readContract({
      contract,
      method: "function patientProfiles(address) view returns (bool isRegistered, uint256 registrationTimestamp, uint256 totalRecords, uint256 lastActivityTimestamp)",
      params: [address],
    });
    
    const [isRegistered, registrationTimestamp, totalRecords, lastActivityTimestamp] = result as [boolean, bigint, bigint, bigint];
    
    return {
      isRegistered,
      registrationTimestamp: Number(registrationTimestamp),
      totalRecords: Number(totalRecords),
      lastActivityTimestamp: Number(lastActivityTimestamp),
    };
  } catch (error) {
    console.error("Error getting patient profile:", error);
    return null;
  }
}

/**
 * Get patient token ID
 */
export async function getPatientId(address: string): Promise<bigint | null> {
  try {
    const contract = getPatientIdentityContract();
    const result = await readContract({
      contract,
      method: "function getPatientId(address _patientWallet) view returns (uint256)",
      params: [address],
    });
    return result as bigint;
  } catch (error) {
    console.error("Error getting patient ID:", error);
    return null;
  }
}

/**
 * Get patient's medical records
 */
export async function getPatientRecords(address: string): Promise<MedicalRecordRef[]> {
  try {
    const contract = getPatientIdentityContract();
    const result = await readContract({
      contract,
      method: "function getPatientRecords(address _patient) view returns ((string ipfsCid, bytes32 dataHash, address hospitalAddress, uint256 timestamp, string icd10Code, string recordType, bool isVerified)[])",
      params: [address],
    });

    return (result as Array<{
      ipfsCid: string;
      dataHash: `0x${string}`;
      hospitalAddress: string;
      timestamp: bigint;
      icd10Code: string;
      recordType: string;
      isVerified: boolean;
    }>).map((r) => ({
      ipfsCid: r.ipfsCid,
      dataHash: r.dataHash,
      hospitalAddress: r.hospitalAddress,
      timestamp: Number(r.timestamp),
      icd10Code: r.icd10Code,
      recordType: r.recordType,
      isVerified: r.isVerified,
    }));
  } catch (error) {
    console.error("Error getting patient records:", error);
    return [];
  }
}

/**
 * Check if hospital has access to patient records
 */
export async function checkAccess(
  patientAddress: string,
  hospitalAddress: string
): Promise<{ hasAccess: boolean; permission: AccessPermission | null }> {
  try {
    const contract = getPatientIdentityContract();
    const result = await readContract({
      contract,
      method: "function checkAccess(address _patient, address _accessor) view returns (bool hasAccess, (bool isGranted, uint256 expiresAt, uint256 grantedAt, string accessType) accessDetails)",
      params: [patientAddress, hospitalAddress],
    });
    
    const [hasAccess, accessDetails] = result as [boolean, { isGranted: boolean; expiresAt: bigint; grantedAt: bigint; accessType: string }];
    
    return {
      hasAccess,
      permission: {
        isGranted: accessDetails.isGranted,
        expiresAt: Number(accessDetails.expiresAt),
        grantedAt: Number(accessDetails.grantedAt),
        accessType: accessDetails.accessType,
      },
    };
  } catch (error) {
    console.error("Error checking access:", error);
    return { hasAccess: false, permission: null };
  }
}

/**
 * Get list of active accessors for a patient
 */
export async function getActiveAccessors(patientAddress: string): Promise<string[]> {
  try {
    const contract = getPatientIdentityContract();
    const result = await readContract({
      contract,
      method: "function getActiveAccessors(address _patient) view returns (address[])",
      params: [patientAddress],
    });
    return result as string[];
  } catch (error) {
    console.error("Error getting active accessors:", error);
    return [];
  }
}

/**
 * Check if hospital is whitelisted (either locally or via registry)
 */
export async function isHospitalWhitelisted(hospitalAddress: string): Promise<boolean> {
  try {
    const contract = getPatientIdentityContract();
    const result = await readContract({
      contract,
      method: "function isWhitelistedHospital(address) view returns (bool)",
      params: [hospitalAddress],
    });
    return result as boolean;
  } catch (error) {
    console.error("Error checking hospital whitelist:", error);
    return false;
  }
}

/**
 * Get hospital info from registry
 */
export async function getHospitalInfo(hospitalAddress: string): Promise<HospitalInfo | null> {
  try {
    const contract = getHospitalRegistryContract();
    const result = await readContract({
      contract,
      method: "function hospitals(address wallet) view returns (string name, string licenseNumber, address walletAddress, bool isVerified)",
      params: [hospitalAddress],
    });
    
    const [name, licenseNumber, walletAddress, isVerified] = result as [string, string, string, boolean];
    
    if (!name) return null;
    
    return {
      name,
      licenseNumber,
      wallet: walletAddress,
      isVerified,
    };
  } catch (error) {
    console.error("Error getting hospital info:", error);
    return null;
  }
}

// ============ ACCESS REQUEST FUNCTIONS ============

/**
 * Get pending access requests for a patient
 */
export async function getPendingAccessRequests(patientAddress: string): Promise<AccessRequest[]> {
  try {
    const contract = getPatientIdentityContract();
    const result = await readContract({
      contract,
      method: "function getPendingAccessRequests(address _patient) view returns ((address hospitalAddress, string hospitalName, uint256 requestedAt, uint256 accessDuration, string message, uint8 status)[])",
      params: [patientAddress],
    });

    return (result as Array<{
      hospitalAddress: string;
      hospitalName: string;
      requestedAt: bigint;
      accessDuration: bigint;
      message: string;
      status: number;
    }>).map((r) => ({
      hospitalAddress: r.hospitalAddress,
      hospitalName: r.hospitalName,
      requestedAt: Number(r.requestedAt),
      accessDuration: Number(r.accessDuration),
      message: r.message,
      status: r.status,
    }));
  } catch (error) {
    console.error("Error getting pending access requests:", error);
    return [];
  }
}

/**
 * Get all access requests for a patient (including processed)
 */
export async function getAllAccessRequests(patientAddress: string): Promise<AccessRequest[]> {
  try {
    const contract = getPatientIdentityContract();
    const result = await readContract({
      contract,
      method: "function getAccessRequests(address _patient) view returns ((address hospitalAddress, string hospitalName, uint256 requestedAt, uint256 accessDuration, string message, uint8 status)[])",
      params: [patientAddress],
    });

    return (result as Array<{
      hospitalAddress: string;
      hospitalName: string;
      requestedAt: bigint;
      accessDuration: bigint;
      message: string;
      status: number;
    }>).map((r) => ({
      hospitalAddress: r.hospitalAddress,
      hospitalName: r.hospitalName,
      requestedAt: Number(r.requestedAt),
      accessDuration: Number(r.accessDuration),
      message: r.message,
      status: r.status,
    }));
  } catch (error) {
    console.error("Error getting all access requests:", error);
    return [];
  }
}

// ============ ERROR PARSING ============

/**
 * Parse contract error to get user-friendly message
 */
function parseContractError(error: unknown): string {
  const errorStr = String(error);
  
  // Check for common error patterns
  if (errorStr.includes("PatientAlreadyRegistered")) {
    return "Patient is already registered on the blockchain";
  }
  if (errorStr.includes("PatientNotRegistered")) {
    return "Patient is not registered on the blockchain";
  }
  if (errorStr.includes("HospitalNotWhitelisted")) {
    return "Hospital is not whitelisted in the system";
  }
  if (errorStr.includes("AccessRequestAlreadyPending")) {
    return "An access request is already pending for this patient";
  }
  if (errorStr.includes("AccessRequestNotPending")) {
    return "This access request is no longer pending";
  }
  if (errorStr.includes("InvalidAccessRequestIndex")) {
    return "Invalid access request";
  }
  if (errorStr.includes("AccessNotGranted")) {
    return "Access has not been granted";
  }
  if (errorStr.includes("user rejected") || errorStr.includes("User rejected")) {
    return "Transaction was rejected by user";
  }
  if (errorStr.includes("insufficient funds")) {
    return "Insufficient funds for gas";
  }
  
  // Return original error message if no match
  if (error instanceof Error) {
    return error.message;
  }
  
  return "Unknown error occurred";
}

// ============ WRITE FUNCTIONS ============

/**
 * Self-register patient identity NFT
 */
export async function selfRegisterPatient(
  account: Account
): Promise<{ success: boolean; txHash?: string; patientId?: string; error?: string }> {
  try {
    const contract = getPatientIdentityContract();
    
    const tx = prepareContractCall({
      contract,
      method: "function selfRegister() returns (uint256)",
      params: [],
    });

    const result = await sendTransaction({
      account,
      transaction: tx,
    });

    return {
      success: true,
      txHash: result.transactionHash,
    };
  } catch (error) {
    console.error("Error self-registering patient identity:", error);
    return {
      success: false,
      error: parseContractError(error),
    };
  }
}

/**
 * Hospital requests access to patient's data (after scanning QR)
 */
export async function requestPatientAccess(
  account: Account,
  patientAddress: string,
  hospitalName: string,
  accessDurationSeconds: number = 31536000, // 1 year default
  message: string = ""
): Promise<{ success: boolean; txHash?: string; error?: string }> {
  try {
    const contract = getPatientIdentityContract();
    
    const tx = prepareContractCall({
      contract,
      method: "function requestAccess(address _patient, string _hospitalName, uint256 _accessDuration, string _message)",
      params: [patientAddress, hospitalName, BigInt(accessDurationSeconds), message],
    });

    const result = await sendTransaction({
      account,
      transaction: tx,
    });

    return {
      success: true,
      txHash: result.transactionHash,
    };
  } catch (error) {
    console.error("Error requesting patient access:", error);
    return {
      success: false,
      error: parseContractError(error),
    };
  }
}

/**
 * Patient approves an access request
 */
export async function approveAccessRequest(
  account: Account,
  requestIndex: number
): Promise<{ success: boolean; txHash?: string; error?: string }> {
  try {
    const contract = getPatientIdentityContract();
    
    const tx = prepareContractCall({
      contract,
      method: "function approveAccessRequest(uint256 _requestIndex)",
      params: [BigInt(requestIndex)],
    });

    const result = await sendTransaction({
      account,
      transaction: tx,
    });

    return {
      success: true,
      txHash: result.transactionHash,
    };
  } catch (error) {
    console.error("Error approving access request:", error);
    return {
      success: false,
      error: parseContractError(error),
    };
  }
}

/**
 * Patient rejects an access request
 */
export async function rejectAccessRequest(
  account: Account,
  requestIndex: number
): Promise<{ success: boolean; txHash?: string; error?: string }> {
  try {
    const contract = getPatientIdentityContract();
    
    const tx = prepareContractCall({
      contract,
      method: "function rejectAccessRequest(uint256 _requestIndex)",
      params: [BigInt(requestIndex)],
    });

    const result = await sendTransaction({
      account,
      transaction: tx,
    });

    return {
      success: true,
      txHash: result.transactionHash,
    };
  } catch (error) {
    console.error("Error rejecting access request:", error);
    return {
      success: false,
      error: parseContractError(error),
    };
  }
}

/**
 * Patient grants access to a hospital
 */
export async function grantAccess(
  account: Account,
  hospitalAddress: string,
  accessType: string = "FULL",
  expiresAt: number = 0 // 0 = permanent until revoked
): Promise<{ success: boolean; txHash?: string; error?: string }> {
  try {
    const contract = getPatientIdentityContract();
    
    const tx = prepareContractCall({
      contract,
      method: "function grantAccess(address _accessor, string _accessType, uint256 _expiresAt)",
      params: [hospitalAddress, accessType, BigInt(expiresAt)],
    });

    const result = await sendTransaction({
      account,
      transaction: tx,
    });

    return {
      success: true,
      txHash: result.transactionHash,
    };
  } catch (error) {
    console.error("Error granting access:", error);
    return {
      success: false,
      error: parseContractError(error),
    };
  }
}

/**
 * Patient revokes access from a hospital
 */
export async function revokeAccess(
  account: Account,
  hospitalAddress: string
): Promise<{ success: boolean; txHash?: string; error?: string }> {
  try {
    const contract = getPatientIdentityContract();
    
    const tx = prepareContractCall({
      contract,
      method: "function revokeAccess(address _accessor)",
      params: [hospitalAddress],
    });

    const result = await sendTransaction({
      account,
      transaction: tx,
    });

    return {
      success: true,
      txHash: result.transactionHash,
    };
  } catch (error) {
    console.error("Error revoking access:", error);
    return {
      success: false,
      error: parseContractError(error),
    };
  }
}

/**
 * Hospital adds a medical record for a patient
 */
export async function addMedicalRecord(
  account: Account,
  patientAddress: string,
  ipfsCid: string,
  dataHash: `0x${string}`,
  icd10Code: string,
  recordType: string
): Promise<{ success: boolean; txHash?: string; error?: string }> {
  try {
    const contract = getPatientIdentityContract();
    
    const tx = prepareContractCall({
      contract,
      method: "function addMedicalRecord(address _patient, string _ipfsCid, bytes32 _dataHash, string _icd10Code, string _recordType)",
      params: [patientAddress, ipfsCid, dataHash, icd10Code, recordType],
    });

    const result = await sendTransaction({
      account,
      transaction: tx,
    });

    return {
      success: true,
      txHash: result.transactionHash,
    };
  } catch (error) {
    console.error("Error adding medical record:", error);
    return {
      success: false,
      error: parseContractError(error),
    };
  }
}

// ============ HOSPITAL REGISTRY FUNCTIONS ============

/**
 * Register a hospital in the registry
 */
export async function registerHospital(
  account: Account,
  name: string,
  licenseNumber: string
): Promise<{ success: boolean; txHash?: string; error?: string }> {
  try {
    const contract = getHospitalRegistryContract();
    
    const tx = prepareContractCall({
      contract,
      method: "function registerHospital(string _name, string _licenseNumber)",
      params: [name, licenseNumber],
    });

    const result = await sendTransaction({
      account,
      transaction: tx,
    });

    return {
      success: true,
      txHash: result.transactionHash,
    };
  } catch (error) {
    console.error("Error registering hospital:", error);
    return {
      success: false,
      error: parseContractError(error),
    };
  }
}

// ============ UTILITY FUNCTIONS ============

/**
 * Get block explorer URL for transaction
 */
export function getExplorerUrl(txHash: string): string {
  return `${CHAIN_CONFIG.blockExplorer}/tx/${txHash}`;
}

/**
 * Get block explorer URL for address
 */
export function getAddressExplorerUrl(address: string): string {
  return `${CHAIN_CONFIG.blockExplorer}/address/${address}`;
}

/**
 * Convert string to bytes32 hash (for data integrity)
 */
export function stringToBytes32(str: string): `0x${string}` {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashArray = new Uint8Array(32);
  for (let i = 0; i < Math.min(data.length, 32); i++) {
    hashArray[i] = data[i];
  }
  return `0x${Array.from(hashArray)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")}`;
}

/**
 * Create SHA-256 hash of data
 */
export async function createDataHash(data: string): Promise<`0x${string}`> {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest("SHA-256", dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return `0x${hashArray.map((b) => b.toString(16).padStart(2, "0")).join("")}`;
}
