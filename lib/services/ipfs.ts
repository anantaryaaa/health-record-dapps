/**
 * IPFS Service for Medichain
 * Handles encrypted medical data storage using Pinata
 */

// Pinata gateway for reading data (public)
const PINATA_GATEWAY = process.env.NEXT_PUBLIC_PINATA_GATEWAY || "https://gateway.pinata.cloud/ipfs/";

/**
 * Medical record data structure for IPFS storage
 */
export interface MedicalRecordData {
  // Patient Info (not stored, just for reference)
  patientAddress: string;
  
  // Medical Record Details
  noRekamMedik: string;
  tanggalMasuk: string;
  tanggalKeluar: string;
  diagnosisUtama: string;
  icdCode: string;
  diagnosisSekunder: string;
  keluhan: string;
  riwayatAlergi: string;
  tindakan: string;
  resepObat: string;
  keadaanKeluar: string;
  dokterPenanggungJawab: string;
  
  // Metadata
  hospitalAddress: string;
  hospitalName: string;
  timestamp: number;
  recordType: string;
}

/**
 * Encrypted data structure stored on IPFS
 */
interface EncryptedIPFSData {
  version: string;
  encryptedData: string;
  iv: string;
  metadata: {
    patientAddress: string;
    hospitalAddress: string;
    timestamp: number;
    recordType: string;
    icdCode: string;
  };
}

/**
 * Generate a random encryption key (in production, use patient's key)
 */
async function generateEncryptionKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
}

/**
 * Derive encryption key from patient address (deterministic for retrieval)
 * In production, use a more secure key derivation with patient's private key
 */
async function deriveKeyFromAddress(patientAddress: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(patientAddress + "_medichain_secret_salt_2024"),
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: encoder.encode("medichain_salt"),
      iterations: 100000,
      hash: "SHA-256"
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
}

/**
 * Encrypt data using AES-GCM
 */
async function encryptData(data: string, key: CryptoKey): Promise<{ encrypted: string; iv: string }> {
  const encoder = new TextEncoder();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  
  const encryptedBuffer = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoder.encode(data)
  );
  
  return {
    encrypted: arrayBufferToBase64(encryptedBuffer),
    iv: arrayBufferToBase64(iv.buffer)
  };
}

/**
 * Decrypt data using AES-GCM
 */
async function decryptData(encryptedData: string, iv: string, key: CryptoKey): Promise<string> {
  const decoder = new TextDecoder();
  
  const decryptedBuffer = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: base64ToArrayBuffer(iv) },
    key,
    base64ToArrayBuffer(encryptedData)
  );
  
  return decoder.decode(decryptedBuffer);
}

/**
 * Convert ArrayBuffer to Base64 string
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Convert Base64 string to ArrayBuffer
 */
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Create SHA-256 hash of data for integrity verification
 */
export async function createDataHash(data: string): Promise<`0x${string}`> {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest("SHA-256", dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return `0x${hashArray.map((b) => b.toString(16).padStart(2, "0")).join("")}`;
}

/**
 * Upload encrypted medical record to Pinata IPFS
 */
export async function uploadMedicalRecord(
  recordData: MedicalRecordData
): Promise<{ success: boolean; cid?: string; dataHash?: `0x${string}`; error?: string }> {
  try {
    // Derive encryption key from patient address
    const key = await deriveKeyFromAddress(recordData.patientAddress);
    
    // Prepare data for encryption (exclude sensitive metadata)
    const dataToEncrypt = JSON.stringify({
      noRekamMedik: recordData.noRekamMedik,
      tanggalMasuk: recordData.tanggalMasuk,
      tanggalKeluar: recordData.tanggalKeluar,
      diagnosisUtama: recordData.diagnosisUtama,
      icdCode: recordData.icdCode,
      diagnosisSekunder: recordData.diagnosisSekunder,
      keluhan: recordData.keluhan,
      riwayatAlergi: recordData.riwayatAlergi,
      tindakan: recordData.tindakan,
      resepObat: recordData.resepObat,
      keadaanKeluar: recordData.keadaanKeluar,
      dokterPenanggungJawab: recordData.dokterPenanggungJawab,
      hospitalName: recordData.hospitalName,
    });
    
    // Create hash of original data for integrity
    const dataHash = await createDataHash(dataToEncrypt);
    
    // Encrypt the data
    const { encrypted, iv } = await encryptData(dataToEncrypt, key);
    
    // Prepare IPFS payload with encrypted data and public metadata
    const ipfsPayload: EncryptedIPFSData = {
      version: "1.0",
      encryptedData: encrypted,
      iv: iv,
      metadata: {
        patientAddress: recordData.patientAddress,
        hospitalAddress: recordData.hospitalAddress,
        timestamp: recordData.timestamp,
        recordType: recordData.recordType,
        icdCode: recordData.icdCode, // ICD code can be public for analytics
      }
    };
    
    // Upload via API route (server-side) to protect API keys
    const response = await fetch("/api/ipfs/upload", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        encryptedPayload: ipfsPayload,
        metadata: {
          name: `MedicalRecord_${recordData.patientAddress.slice(0, 8)}_${Date.now()}`,
          keyvalues: {
            type: "medical_record",
            patient: recordData.patientAddress,
            hospital: recordData.hospitalAddress,
            recordType: recordData.recordType,
            icdCode: recordData.icdCode,
          }
        }
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("IPFS upload error:", errorData);
      throw new Error(errorData.error || `Upload failed: ${response.status}`);
    }
    
    const result = await response.json();
    
    return {
      success: true,
      cid: result.cid,
      dataHash,
    };
  } catch (error) {
    console.error("Error uploading to IPFS:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to upload to IPFS",
    };
  }
}

/**
 * Retrieve and decrypt medical record from IPFS
 */
export async function getMedicalRecord(
  cid: string,
  patientAddress: string
): Promise<{ success: boolean; data?: MedicalRecordData; error?: string }> {
  try {
    // Fetch from IPFS gateway
    const response = await fetch(`${PINATA_GATEWAY}${cid}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch from IPFS: ${response.status}`);
    }
    
    const ipfsData: EncryptedIPFSData = await response.json();
    
    // Derive decryption key from patient address
    const key = await deriveKeyFromAddress(patientAddress);
    
    // Decrypt the data
    const decryptedJson = await decryptData(ipfsData.encryptedData, ipfsData.iv, key);
    const decryptedData = JSON.parse(decryptedJson);
    
    return {
      success: true,
      data: {
        patientAddress: ipfsData.metadata.patientAddress,
        hospitalAddress: ipfsData.metadata.hospitalAddress,
        timestamp: ipfsData.metadata.timestamp,
        recordType: ipfsData.metadata.recordType,
        ...decryptedData,
      },
    };
  } catch (error) {
    console.error("Error retrieving from IPFS:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to retrieve from IPFS",
    };
  }
}

/**
 * Verify data integrity by comparing hashes
 */
export async function verifyDataIntegrity(
  cid: string,
  patientAddress: string,
  expectedHash: string
): Promise<boolean> {
  try {
    const result = await getMedicalRecord(cid, patientAddress);
    if (!result.success || !result.data) return false;
    
    const dataToHash = JSON.stringify({
      noRekamMedik: result.data.noRekamMedik,
      tanggalMasuk: result.data.tanggalMasuk,
      tanggalKeluar: result.data.tanggalKeluar,
      diagnosisUtama: result.data.diagnosisUtama,
      icdCode: result.data.icdCode,
      diagnosisSekunder: result.data.diagnosisSekunder,
      keluhan: result.data.keluhan,
      riwayatAlergi: result.data.riwayatAlergi,
      tindakan: result.data.tindakan,
      resepObat: result.data.resepObat,
      keadaanKeluar: result.data.keadaanKeluar,
      dokterPenanggungJawab: result.data.dokterPenanggungJawab,
      hospitalName: result.data.hospitalName,
    });
    
    const computedHash = await createDataHash(dataToHash);
    return computedHash.toLowerCase() === expectedHash.toLowerCase();
  } catch (error) {
    console.error("Error verifying data integrity:", error);
    return false;
  }
}
