export interface PatientData {
    name: string;
    nik: string;
    bloodType: string;
    gender: string;
    age: number;
    walletAddress: string;
    registeredAt: string;
}


const STORAGE_KEY = "medichain_patient_data";

export function getPatientData(walletAddress: string): PatientData | null {
    if (typeof window === "undefined") return null;
    const data = localStorage.getItem(`${STORAGE_KEY}_${walletAddress}`);
    if (!data) return null;
    try {
        return JSON.parse(data);
    } catch {
        return null;
    }
}

export function searchPatients(query: string): PatientData[] {
    if (typeof window === "undefined") return [];
    
    const patients: PatientData[] = [];
    const keys = Object.keys(localStorage);
    
    // Iterate through all keys to find patient data
    keys.forEach(key => {
        if (key.startsWith(`${STORAGE_KEY}_`)) {
            try {
                const item = localStorage.getItem(key);
                if (item) {
                    const data = JSON.parse(item) as PatientData;
                    // Filter based on query (name or NIK)
                    // Normalize query and data for better matching
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

export function savePatientData(data: PatientData): void {
    if (typeof window === "undefined") return;

    localStorage.setItem(
        `${STORAGE_KEY}_${data.walletAddress}`,
        JSON.stringify(data)
    );
}

export function isPatientRegistered(walletAddress: string): boolean {
    return getPatientData(walletAddress) !== null;
}

export function clearPatientData(walletAddress: string): void {
    if (typeof window === "undefined") return;
    localStorage.removeItem(`${STORAGE_KEY}_${walletAddress}`);
    localStorage.removeItem(STORAGE_KEY);
}

export function clearAllPatientData(): void {
    if (typeof window === "undefined") return;
    // Clear all patient related data
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
    if (typeof window === "undefined") return true;
    const value = localStorage.getItem(BIOMETRIC_KEY);
    // Default to true if not set
    if (value === null) return true;
    return value === "true";
}

export function setBiometricEnabled(enabled: boolean): void {
    if (typeof window === "undefined") return;
    localStorage.setItem(BIOMETRIC_KEY, enabled.toString());
}