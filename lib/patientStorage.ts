export interface PatientData {
    name: string;
    nik: string;
    bloodType: string;
    gender: string;
    age: number;
    walletAddress: string;        // Primary wallet (first registration)
    linkedAddresses: string[];    // Additional wallets (e.g., Biometric)
    registeredAt: string;
}


const STORAGE_KEY = "medichain_patient_data";

// Get patient data by wallet address (direct lookup)
export function getPatientData(walletAddress: string): PatientData | null {
    if (typeof window === "undefined") return null;
    
    const data = localStorage.getItem(`${STORAGE_KEY}_${walletAddress}`);
    if (!data) return null;
    
    try {
        const parsed = JSON.parse(data) as PatientData;
        // Ensure linkedAddresses exists for backward compatibility
        if (!parsed.linkedAddresses) {
            parsed.linkedAddresses = [];
        }
        return parsed;
    } catch {
        return null;
    }
}

export function searchPatients(query: string): PatientData[] {
    if (typeof window === "undefined") return [];
    
    const patients: PatientData[] = [];
    const seenNIKs = new Set<string>(); // Avoid duplicates from linked addresses
    const keys = Object.keys(localStorage);
    
    keys.forEach(key => {
        if (key.startsWith(`${STORAGE_KEY}_`)) {
            try {
                const item = localStorage.getItem(key);
                if (item) {
                    const data = JSON.parse(item) as PatientData;
                    
                    // Skip if we've already seen this patient (by NIK)
                    if (seenNIKs.has(data.nik)) return;
                    seenNIKs.add(data.nik);
                    
                    const cleanQuery = query.toLowerCase().trim();
                    const cleanName = data.name ? data.name.toLowerCase() : "";
                    const cleanNIK = data.nik ? data.nik.toString().toLowerCase() : "";
                    
                    if (!cleanQuery || 
                        cleanName.includes(cleanQuery) || 
                        cleanNIK.includes(cleanQuery)) {
                        patients.push(data);
                    }
                }
            } catch (e) {
                console.error("Error parsing patient data", e);
            }
        }
    });
    
    return patients;
}

// Save patient data (saves under primary wallet and all linked addresses)
export function savePatientData(data: PatientData): void {
    if (typeof window === "undefined") return;

    // Ensure linkedAddresses exists
    if (!data.linkedAddresses) {
        data.linkedAddresses = [];
    }
    
    const jsonData = JSON.stringify(data);
    
    // Save under primary wallet address
    localStorage.setItem(`${STORAGE_KEY}_${data.walletAddress}`, jsonData);
    
    // Also save under all linked addresses
    data.linkedAddresses.forEach(address => {
        localStorage.setItem(`${STORAGE_KEY}_${address}`, jsonData);
    });
}

// Link a new wallet address to an existing patient
export function linkWalletToPatient(existingData: PatientData, newWalletAddress: string): PatientData {
    // Ensure linkedAddresses exists
    if (!existingData.linkedAddresses) {
        existingData.linkedAddresses = [];
    }
    
    // Don't add if it's the primary address or already linked
    if (newWalletAddress === existingData.walletAddress) {
        return existingData;
    }
    
    if (!existingData.linkedAddresses.includes(newWalletAddress)) {
        existingData.linkedAddresses.push(newWalletAddress);
    }
    
    // Save under all addresses including the new one
    savePatientData(existingData);
    
    return existingData;
}

export function isPatientRegistered(walletAddress: string): boolean {
    return getPatientData(walletAddress) !== null;
}

export function clearPatientData(walletAddress: string): void {
    if (typeof window === "undefined") return;
    localStorage.removeItem(`${STORAGE_KEY}_${walletAddress}`);
}

export function clearAllPatientData(): void {
    if (typeof window === "undefined") return;
    // Clear all address-specific patient data
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
        if (key.startsWith(STORAGE_KEY)) {
            localStorage.removeItem(key);
        }
    });
}

export function clearAllAppData(): void {
    if (typeof window === "undefined") return;
    
    // Clear patient data
    clearAllPatientData();
    
    // Clear Thirdweb connection history
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
        if (
            key.startsWith("thirdweb") || 
            key.startsWith("walletconnect") ||
            key.startsWith("wc@") ||
            key.includes("wallet") ||
            key.includes("connector")
        ) {
            localStorage.removeItem(key);
        }
    });
    
    // Clear biometric credentials and preferences
    localStorage.removeItem("medichain_biometric_credentials");
    localStorage.removeItem("medichain_biometric_enabled");
}

// Biometric preference functions
const BIOMETRIC_KEY = "medichain_biometric_enabled";

export function getBiometricEnabled(): boolean {
    if (typeof window === "undefined") return false;
    const value = localStorage.getItem(BIOMETRIC_KEY);
    // Default to FALSE if not set (user requested biometric OFF by default)
    if (value === null) return false;
    return value === "true";
}

export function setBiometricEnabled(enabled: boolean): void {
    if (typeof window === "undefined") return;
    localStorage.setItem(BIOMETRIC_KEY, enabled.toString());
}