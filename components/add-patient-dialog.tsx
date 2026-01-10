"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Plus, User, FileText, Calendar } from "lucide-react"

export function AddPatientDialog() {
  const [open, setOpen] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Add Patient
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Patient</DialogTitle>
          <DialogDescription>
            Enter patient details to create a new record on the blockchain.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="patientName" className="text-sm font-medium">
              Patient Name
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="patientName"
                placeholder="Enter full name"
                className="pl-9"
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <label htmlFor="condition" className="text-sm font-medium">
              Medical Condition
            </label>
            <div className="relative">
              <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="condition"
                placeholder="Primary diagnosis"
                className="pl-9"
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <label htmlFor="dob" className="text-sm font-medium">
              Date of Birth
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="dob"
                type="date"
                className="pl-9"
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <label htmlFor="patientId" className="text-sm font-medium">
              Patient Government ID
            </label>
            <Input
              id="patientId"
              placeholder="Enter Government ID"
              required
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Create Record</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
