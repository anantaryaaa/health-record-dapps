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
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return null;
    try {
        return JSON.parse(data);
    } catch {
        return null;
    }
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
    
    // Clear biometric credentials
    localStorage.removeItem("medichain_biometric_credentials");
}