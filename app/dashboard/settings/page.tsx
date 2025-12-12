"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Settings, Shield, Bell, Database, Key } from "lucide-react"

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage your hospital node configuration</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Database className="w-4 h-4" />
              Node Configuration
            </CardTitle>
            <CardDescription>Configure your blockchain node settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Node Name</label>
              <Input defaultValue="RS Medika Utama - Node 1" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Network Endpoint</label>
              <Input defaultValue="wss://medichain.network/ws" disabled />
            </div>
            <Button variant="outline">Update Configuration</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Key className="w-4 h-4" />
              Access Keys
            </CardTitle>
            <CardDescription>Manage your API and encryption keys</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">API Key</label>
              <Input type="password" defaultValue="sk_live_xxxxxxxxxxxxx" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Encryption Key</label>
              <Input type="password" defaultValue="enc_xxxxxxxxxxxxx" />
            </div>
            <Button variant="outline">Regenerate Keys</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Shield className="w-4 h-4" />
              Security Settings
            </CardTitle>
            <CardDescription>Configure security and access controls</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-md bg-secondary">
              <div>
                <p className="font-medium text-sm">Two-Factor Authentication</p>
                <p className="text-xs text-muted-foreground">Add an extra layer of security</p>
              </div>
              <Button size="sm" variant="outline">Enable</Button>
            </div>
            <div className="flex items-center justify-between p-3 rounded-md bg-secondary">
              <div>
                <p className="font-medium text-sm">IP Whitelist</p>
                <p className="text-xs text-muted-foreground">Restrict access by IP address</p>
              </div>
              <Button size="sm" variant="outline">Configure</Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Bell className="w-4 h-4" />
              Notifications
            </CardTitle>
            <CardDescription>Manage your notification preferences</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-md bg-secondary">
              <div>
                <p className="font-medium text-sm">Access Alerts</p>
                <p className="text-xs text-muted-foreground">Get notified on data access</p>
              </div>
              <Button size="sm" variant="secondary">On</Button>
            </div>
            <div className="flex items-center justify-between p-3 rounded-md bg-secondary">
              <div>
                <p className="font-medium text-sm">Security Alerts</p>
                <p className="text-xs text-muted-foreground">Critical security notifications</p>
              </div>
              <Button size="sm" variant="secondary">On</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
