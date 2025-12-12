"use client"

import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { AddPatientDialog } from "@/components/add-patient-dialog"
import { Search, Users, Clock, Lock, Unlock } from "lucide-react"

const patients = [
  { id: "P-001", name: "Budi Santoso", nik: "320***001", time: "10:30", status: "In Consultation", locked: false },
  { id: "P-002", name: "Siti Aminah", nik: "320***002", time: "10:45", status: "Waiting", locked: true },
  { id: "P-003", name: "Ahmad Wijaya", nik: "320***003", time: "11:00", status: "Completed", locked: true },
  { id: "P-004", name: "Dewi Lestari", nik: "320***004", time: "11:15", status: "Waiting", locked: true },
]

export default function PatientsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Antrian Pasien</h1>
          <p className="text-muted-foreground">Pilih pasien untuk memulai konsultasi atau melihat rekam medis</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Cari Nama / NIK Pasien..." className="pl-9 w-64" />
          </div>
          <AddPatientDialog />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {patients.map((patient) => (
          <Card key={patient.id} className="hover:bg-accent transition-colors cursor-pointer">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="w-10 h-10 rounded-md bg-secondary flex items-center justify-center text-sm font-bold">
                  {patient.name.charAt(0)}
                </div>
                <span className={`text-xs px-2 py-1 rounded-md font-medium ${
                  patient.status === "In Consultation" 
                    ? "bg-primary text-primary-foreground" 
                    : patient.status === "Waiting"
                    ? "bg-secondary text-secondary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}>
                  {patient.status}
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <h3 className="font-medium">{patient.name}</h3>
                <p className="text-sm text-muted-foreground">{patient.id}</p>
              </div>
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {patient.time}
                </span>
                <span className="flex items-center gap-1">
                  {patient.locked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                  {patient.locked ? "Locked" : "Unlocked"}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}

        {/* Add new patient card */}
        <Card className="border-dashed hover:border-foreground/50 transition-colors cursor-pointer flex items-center justify-center min-h-[180px]">
          <div className="text-center p-6">
            <div className="w-10 h-10 rounded-md bg-secondary flex items-center justify-center mx-auto mb-3">
              <Users className="w-5 h-5 text-muted-foreground" />
            </div>
            <p className="font-medium">Cari / Pasien Baru</p>
            <p className="text-sm text-muted-foreground">Scan QR atau Input NIK Manual</p>
          </div>
        </Card>
      </div>
    </div>
  )
}
