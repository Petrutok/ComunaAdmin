'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Department, User } from '@/types/departments';
import { EmailPriority } from '@/types/registratura';
import { findDepartmentBySubject, getSuggestedPriority } from '@/lib/utils/auto-assignment';
import { Building2, UserPlus, Zap, Clock, ArrowUpDown, Lightbulb } from 'lucide-react';

interface AssignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  emailSubject?: string;
  departments: Department[];
  users: User[];
  currentAssignment?: {
    departmentId: string | null;
    userId: string | null;
    priority: EmailPriority;
  };
  onAssign: (departmentId: string | null, userId: string | null, priority: EmailPriority) => void;
}

const priorityConfig = {
  urgent: { label: 'Urgent (1 zi)', icon: Zap, color: 'bg-rose-600' },
  normal: { label: 'Normal (30 zile)', icon: Clock, color: 'bg-amber-600' },
  low: { label: 'Scăzută (60 zile)', icon: ArrowUpDown, color: 'bg-gray-600' },
};

export function AssignmentDialog({
  open,
  onOpenChange,
  emailSubject,
  departments,
  users,
  currentAssignment,
  onAssign,
}: AssignmentDialogProps) {
  const [departmentId, setDepartmentId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [priority, setPriority] = useState<EmailPriority>('normal');
  const [suggestedDept, setSuggestedDept] = useState<string | null>(null);
  const [suggestedPriority, setSuggestedPriority] = useState<EmailPriority>('normal');

  // Filter users by selected department
  const filteredUsers = departmentId
    ? users.filter(u => u.departmentId === departmentId && u.active)
    : users.filter(u => u.active);

  useEffect(() => {
    if (open) {
      // Set current values or defaults
      setDepartmentId(currentAssignment?.departmentId || null);
      setUserId(currentAssignment?.userId || null);
      setPriority(currentAssignment?.priority || 'normal');

      // Auto-suggest based on email subject
      if (emailSubject && !currentAssignment?.departmentId) {
        const suggested = findDepartmentBySubject(emailSubject);
        const sugPriority = getSuggestedPriority(emailSubject);

        if (suggested) {
          const dept = departments.find(d => d.name === suggested);
          if (dept) {
            setSuggestedDept(dept.id);
            setDepartmentId(dept.id);
          }
        }

        setSuggestedPriority(sugPriority);
        setPriority(sugPriority);
      }
    }
  }, [open, emailSubject, currentAssignment, departments]);

  const handleAssign = () => {
    onAssign(departmentId, userId, priority);
    onOpenChange(false);
  };

  const selectedDepartment = departments.find(d => d.id === departmentId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-800 border-slate-700 max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-blue-400" />
            Atribuire Document
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Selectează departamentul și utilizatorul responsabil pentru acest document
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-4">
          {/* Auto-suggestion notice */}
          {suggestedDept && (
            <div className="flex items-start gap-3 bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
              <Lightbulb className="h-5 w-5 text-blue-400 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-blue-300 font-medium">Sugestie automată</p>
                <p className="text-xs text-gray-400 mt-1">
                  Bazat pe cuvinte cheie din subiect, documentul a fost atribuit automat
                </p>
              </div>
            </div>
          )}

          {/* Department Selection */}
          <div>
            <label className="text-sm text-gray-400 mb-2 block flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Departament
            </label>
            <Select
              value={departmentId || 'none'}
              onValueChange={(value) => {
                setDepartmentId(value === 'none' ? null : value);
                // Reset user selection when department changes
                if (value !== departmentId) {
                  setUserId(null);
                }
              }}
            >
              <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white">
                <SelectValue placeholder="Selectează departament" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                <SelectItem value="none" className="text-gray-400">
                  Fără departament
                </SelectItem>
                {departments.map((dept) => (
                  <SelectItem key={dept.id} value={dept.id} className="text-gray-300">
                    {dept.name}
                    {dept.responsibleUserName && (
                      <span className="text-xs text-gray-500 ml-2">
                        (Responsabil: {dept.responsibleUserName})
                      </span>
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedDepartment?.description && (
              <p className="text-xs text-gray-500 mt-1">{selectedDepartment.description}</p>
            )}
          </div>

          {/* User Selection */}
          <div>
            <label className="text-sm text-gray-400 mb-2 block flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              Utilizator Responsabil
              {departmentId && (
                <span className="text-xs text-gray-500">
                  ({filteredUsers.length} disponibili în departament)
                </span>
              )}
            </label>
            <Select
              value={userId || 'none'}
              onValueChange={(value) => setUserId(value === 'none' ? null : value)}
              disabled={filteredUsers.length === 0}
            >
              <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white">
                <SelectValue placeholder="Selectează utilizator" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                <SelectItem value="none" className="text-gray-400">
                  Fără utilizator specific
                </SelectItem>
                {filteredUsers.map((user) => (
                  <SelectItem key={user.id} value={user.id} className="text-gray-300">
                    <div className="flex items-center gap-2">
                      <span>{user.fullName}</span>
                      {user.role === 'admin' && (
                        <Badge className="bg-rose-600 text-xs">Admin</Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {filteredUsers.length === 0 && departmentId && (
              <p className="text-xs text-amber-400 mt-1">
                Nu există utilizatori activi în acest departament
              </p>
            )}
          </div>

          {/* Priority Selection */}
          <div>
            <label className="text-sm text-gray-400 mb-2 block">Prioritate</label>
            <div className="grid grid-cols-3 gap-3">
              {(Object.keys(priorityConfig) as EmailPriority[]).map((p) => {
                const config = priorityConfig[p];
                const Icon = config.icon;
                const isSelected = priority === p;

                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPriority(p)}
                    className={`
                      flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all
                      ${isSelected
                        ? `${config.color} border-white/30 shadow-lg`
                        : 'bg-slate-700/30 border-slate-600 hover:border-slate-500'
                      }
                    `}
                  >
                    <Icon className={`h-6 w-6 ${isSelected ? 'text-white' : 'text-gray-400'}`} />
                    <span className={`text-sm font-medium ${isSelected ? 'text-white' : 'text-gray-300'}`}>
                      {config.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Summary */}
          {(departmentId || userId) && (
            <div className="bg-slate-700/30 rounded-lg p-4 border border-slate-600">
              <p className="text-sm text-gray-400 mb-2">Rezumat atribuire:</p>
              <div className="space-y-1 text-sm">
                {departmentId && (
                  <div className="text-white">
                    📁 <span className="font-medium">{selectedDepartment?.name}</span>
                  </div>
                )}
                {userId && (
                  <div className="text-white">
                    👤 <span className="font-medium">{filteredUsers.find(u => u.id === userId)?.fullName}</span>
                  </div>
                )}
                <div className="text-white">
                  ⏱️ Prioritate: <span className="font-medium">{priorityConfig[priority].label}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-slate-600 text-gray-300"
          >
            Anulează
          </Button>
          <Button
            onClick={handleAssign}
            className="bg-blue-600 hover:bg-blue-500"
            disabled={!departmentId && !userId}
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Atribuie
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
