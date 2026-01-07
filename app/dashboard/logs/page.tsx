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
import { FileText, Eye, Download, Shield } from "lucide-react"

const logs = [
  { id: "LOG-001", action: "View Record", user: "Dr. Andi", patient: "Budi Santoso", time: "2024-12-12 10:30:15", ip: "192.168.1.***" },
  { id: "LOG-002", action: "Download Report", user: "Admin", patient: "Siti Aminah", time: "2024-12-12 10:28:42", ip: "192.168.1.***" },
  { id: "LOG-003", action: "Update Record", user: "Dr. Andi", patient: "Ahmad Wijaya", time: "2024-12-12 10:15:33", ip: "192.168.1.***" },
  { id: "LOG-004", action: "Access Request", user: "RS Medika", patient: "Dewi Lestari", time: "2024-12-12 09:45:21", ip: "10.0.0.***" },
  { id: "LOG-005", action: "View Record", user: "Dr. Sari", patient: "Rudi Hartono", time: "2024-12-12 09:30:08", ip: "192.168.1.***" },
]

export default function LogsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Access Logs</h1>
        <p className="text-muted-foreground">Monitor all data access activities on the blockchain</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-md bg-secondary flex items-center justify-center">
                <Eye className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">1,247</p>
                <p className="text-sm text-muted-foreground">Total Views Today</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-md bg-secondary flex items-center justify-center">
                <Download className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">89</p>
                <p className="text-sm text-muted-foreground">Downloads Today</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-md bg-secondary flex items-center justify-center">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">0</p>
                <p className="text-sm text-muted-foreground">Security Alerts</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="w-4 h-4" />
            Recent Access Logs
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Log ID</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>User</TableHead>
                <TableHead className="hidden md:table-cell">Patient</TableHead>
                <TableHead className="hidden sm:table-cell">Timestamp</TableHead>
                <TableHead className="hidden lg:table-cell">IP Address</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="font-mono text-sm">{log.id}</TableCell>
                  <TableCell>
                    <span className="px-2 py-1 rounded-md text-xs font-medium bg-secondary">
                      {log.action}
                    </span>
                  </TableCell>
                  <TableCell className="font-medium">{log.user}</TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground">{log.patient}</TableCell>
                  <TableCell className="hidden sm:table-cell text-muted-foreground text-sm">{log.time}</TableCell>
                  <TableCell className="hidden lg:table-cell font-mono text-sm text-muted-foreground">{log.ip}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
