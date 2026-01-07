export interface HospitalData {
    // Hospital Info
    name: string;
    type: "general" | "clinic" | "laboratory" | "specialist";
    licenseNumber: string;
    address: string;
    city: string;
    phone: string;
    // PIC Info
    picName: string;
    picPosition: string;
    picPhone: string;
    picEmail: string;
    // Metadata
    walletAddress: string;
    registeredAt: string;
}

const STORAGE_KEY = "medichain_hospital_data";

export function getHospitalData(walletAddress: string): HospitalData | null {
    if (typeof window === "undefined") return null;
    
    const data = localStorage.getItem(`${STORAGE_KEY}_${walletAddress}`);
    if (!data) return null;
    
    try {
        return JSON.parse(data) as HospitalData;
    } catch {
        return null;
    }
}

export function saveHospitalData(data: HospitalData): void {
    if (typeof window === "undefined") return;
    localStorage.setItem(`${STORAGE_KEY}_${data.walletAddress}`, JSON.stringify(data));
}

export function isHospitalRegistered(walletAddress: string): boolean {
    return getHospitalData(walletAddress) !== null;
}

export function clearHospitalData(walletAddress: string): void {
    if (typeof window === "undefined") return;
    localStorage.removeItem(`${STORAGE_KEY}_${walletAddress}`);
}

export const hospitalTypeLabels: Record<HospitalData["type"], string> = {
    general: "General Hospital",
    clinic: "Clinic",
    laboratory: "Laboratory",
    specialist: "Specialist Hospital",
};
