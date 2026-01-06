"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { 
  Bell, 
  Building2, 
  Clock, 
  CheckCircle2, 
  XCircle,
  Loader2,
  AlertCircle
} from "lucide-react"
import { type Account } from "thirdweb/wallets"
import { 
  getPendingAccessRequests, 
  approveAccessRequest, 
  rejectAccessRequest,
  AccessRequest 
} from "@/lib/services/blockchain"

interface PendingAccessRequestsProps {
  account: Account
  patientAddress: string
}

export function PendingAccessRequests({ account, patientAddress }: PendingAccessRequestsProps) {
  const [requests, setRequests] = useState<AccessRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [processingIndex, setProcessingIndex] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Fetch pending requests
  const fetchRequests = async () => {
    try {
      setLoading(true)
      const pendingRequests = await getPendingAccessRequests(patientAddress)
      setRequests(pendingRequests)
      setError(null)
    } catch (err) {
      console.error("Error fetching pending requests:", err)
      setError("Failed to load access requests")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRequests()
    // Poll every 30 seconds for new requests
    const interval = setInterval(fetchRequests, 30000)
    return () => clearInterval(interval)
  }, [patientAddress])

  const handleApprove = async (index: number) => {
    setProcessingIndex(index)
    try {
      const result = await approveAccessRequest(account, index)
      if (result.success) {
        // Refresh the list
        await fetchRequests()
      } else {
        setError(result.error || "Failed to approve request")
      }
    } catch (err) {
      console.error("Error approving request:", err)
      setError("Failed to approve request")
    } finally {
      setProcessingIndex(null)
    }
  }

  const handleReject = async (index: number) => {
    setProcessingIndex(index)
    try {
      const result = await rejectAccessRequest(account, index)
      if (result.success) {
        // Refresh the list
        await fetchRequests()
      } else {
        setError(result.error || "Failed to reject request")
      }
    } catch (err) {
      console.error("Error rejecting request:", err)
      setError("Failed to reject request")
    } finally {
      setProcessingIndex(null)
    }
  }

  const formatDuration = (seconds: number): string => {
    if (seconds === 0) return "Permanent"
    const days = Math.floor(seconds / 86400)
    if (days >= 365) return `${Math.floor(days / 365)} year(s)`
    if (days >= 30) return `${Math.floor(days / 30)} month(s)`
    return `${days} day(s)`
  }

  const formatTimeAgo = (timestamp: number): string => {
    const now = Math.floor(Date.now() / 1000)
    const diff = now - timestamp
    if (diff < 60) return "Just now"
    if (diff < 3600) return `${Math.floor(diff / 60)} min ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`
    return `${Math.floor(diff / 86400)} days ago`
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Bell className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold text-foreground">Access Requests</h3>
          </div>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Loading requests...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold text-foreground">Access Requests</h3>
            {requests.length > 0 && (
              <span className="px-2 py-0.5 bg-primary text-primary-foreground text-xs font-medium rounded-full">
                {requests.length}
              </span>
            )}
          </div>
          <Button variant="ghost" size="sm" onClick={fetchRequests}>
            Refresh
          </Button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center gap-2 text-destructive text-sm">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        {requests.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Bell className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No pending requests</p>
            <p className="text-sm">You&apos;ll see access requests from hospitals here</p>
          </div>
        ) : (
          <div className="space-y-3">
            {requests.map((request, index) => (
              <div 
                key={`${request.hospitalAddress}-${request.requestedAt}`}
                className="p-4 bg-muted/30 rounded-xl border border-border"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Building2 className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">{request.hospitalName}</p>
                      <p className="text-xs text-muted-foreground font-mono">
                        {request.hospitalAddress.slice(0, 6)}...{request.hospitalAddress.slice(-4)}
                      </p>
                      {request.message && (
                        <p className="text-sm text-muted-foreground mt-1 italic">
                          &quot;{request.message}&quot;
                        </p>
                      )}
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatTimeAgo(request.requestedAt)}
                        </span>
                        <span>•</span>
                        <span>Duration: {formatDuration(request.accessDuration)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 mt-4">
                  <Button
                    size="sm"
                    className="flex-1 gap-1 bg-green-600 hover:bg-green-700"
                    onClick={() => handleApprove(index)}
                    disabled={processingIndex !== null}
                  >
                    {processingIndex === index ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4" />
                    )}
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 gap-1 border-destructive text-destructive hover:bg-destructive/10"
                    onClick={() => handleReject(index)}
                    disabled={processingIndex !== null}
                  >
                    {processingIndex === index ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <XCircle className="w-4 h-4" />
                    )}
                    Reject
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
