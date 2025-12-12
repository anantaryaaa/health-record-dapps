"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { AddPatientDialog } from "@/components/add-patient-dialog"
import {
  Users,
  HardDrive,
  Activity,
  Shield,
  Clock,
  CheckCircle2,
  AlertCircle,
} from "lucide-react"

const stats = [
  { title: "Total Patients", value: "2,847", change: "+12%", icon: Users },
  { title: "Storage on Chain", value: "1.2 TB", change: "85% used", icon: HardDrive },
  { title: "Network Status", value: "Online", change: "99.9% uptime", icon: Activity },
  { title: "Security Score", value: "A+", change: "All checks passed", icon: Shield },
]

const patients = [
  { id: "P-001", name: "Budi Santoso", condition: "Diabetes Type 2", timestamp: "2024-12-12 10:30", status: "verified" },
  { id: "P-002", name: "Siti Aminah", condition: "Hypertension", timestamp: "2024-12-12 10:45", status: "pending" },
  { id: "P-003", name: "Ahmad Wijaya", condition: "Asthma", timestamp: "2024-12-12 11:00", status: "verified" },
  { id: "P-004", name: "Dewi Lestari", condition: "Allergic Rhinitis", timestamp: "2024-12-12 11:15", status: "verified" },
  { id: "P-005", name: "Rudi Hartono", condition: "Cardiac Arrhythmia", timestamp: "2024-12-12 11:30", status: "critical" },
]

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Overview of your hospital node</p>
        </div>
        <AddPatientDialog />
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <stat.icon className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">{stat.change}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Patient table */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="w-4 h-4" />
              Recent Patient Records
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead className="hidden md:table-cell">Condition</TableHead>
                  <TableHead className="hidden sm:table-cell">Timestamp</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {patients.map((patient) => (
                  <TableRow key={patient.id}>
                    <TableCell className="font-mono text-sm">{patient.id}</TableCell>
                    <TableCell className="font-medium">{patient.name}</TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">
                      {patient.condition}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-muted-foreground text-sm">
                      {patient.timestamp}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={patient.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Activity feed */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="w-4 h-4" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ActivityItem
              title="New patient registered"
              description="Budi Santoso added to network"
              time="2 min ago"
            />
            <ActivityItem
              title="Data sync completed"
              description="All nodes synchronized"
              time="15 min ago"
            />
            <ActivityItem
              title="Access request"
              description="RS Medika requested access"
              time="1 hour ago"
            />
            <ActivityItem
              title="Security scan passed"
              description="No vulnerabilities found"
              time="3 hours ago"
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const config = {
    verified: { bg: "bg-secondary", text: "text-foreground", icon: CheckCircle2 },
    pending: { bg: "bg-secondary", text: "text-muted-foreground", icon: Clock },
    critical: { bg: "bg-destructive/10", text: "text-destructive", icon: AlertCircle },
  }

  const { bg, text, icon: Icon } = config[status as keyof typeof config] || config.pending

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium ${bg} ${text}`}>
      <Icon className="w-3 h-3" />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  )
}

function ActivityItem({ title, description, time }: { title: string; description: string; time: string }) {
  return (
    <div className="flex gap-3">
      <div className="w-2 h-2 rounded-full mt-2 bg-foreground" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground truncate">{description}</p>
        <p className="text-xs text-muted-foreground mt-1">{time}</p>
      </div>
    </div>
  )
}
