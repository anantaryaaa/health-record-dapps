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
const CURRENT_PATIENT_KEY = "medichain_current_patient"; // Global key for logged-in patient

// Get the currently logged-in patient's data (ignores wallet address, uses global key)
export function getPatientData(walletAddress?: string): PatientData | null {
    if (typeof window === "undefined") return null;
    
    // First, try global current patient key (primary source)
    const currentPatient = localStorage.getItem(CURRENT_PATIENT_KEY);
    if (currentPatient) {
        try {
            return JSON.parse(currentPatient);
        } catch {
            // Fall through to legacy lookup
        }
    }
    
    // Legacy fallback: try address-specific key (for migration)
    if (walletAddress) {
        const legacyData = localStorage.getItem(`${STORAGE_KEY}_${walletAddress}`);
        if (legacyData) {
            try {
                const parsed = JSON.parse(legacyData);
                // Migrate to new global key
                localStorage.setItem(CURRENT_PATIENT_KEY, legacyData);
                return parsed;
            } catch {
                return null;
            }
        }
    }
    
    return null;
}

export function searchPatients(query: string): PatientData[] {
    if (typeof window === "undefined") return [];
    
    const patients: PatientData[] = [];
    const keys = Object.keys(localStorage);
    
    // Iterate through all keys to find patient data (per-address storage for hospital search)
    keys.forEach(key => {
        if (key.startsWith(`${STORAGE_KEY}_`)) {
            try {
                const item = localStorage.getItem(key);
                if (item) {
                    const data = JSON.parse(item) as PatientData;
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

    // Save to GLOBAL key (used by logged-in patient)
    localStorage.setItem(CURRENT_PATIENT_KEY, JSON.stringify(data));
    
    // ALSO save to address-specific key (for hospital search functionality)
    localStorage.setItem(
        `${STORAGE_KEY}_${data.walletAddress}`,
        JSON.stringify(data)
    );
}

export function isPatientRegistered(walletAddress?: string): boolean {
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