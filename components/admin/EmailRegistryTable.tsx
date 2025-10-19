'use client';

import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Eye, Download, Trash2, Edit } from 'lucide-react';
import { RegistraturaEmail, EmailStatus } from '@/types/registratura';
import { format } from 'date-fns';
import { ro } from 'date-fns/locale';

interface EmailRegistryTableProps {
  emails: RegistraturaEmail[];
  onStatusChange: (id: string, status: EmailStatus, observatii?: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

// Ajustăm tipurile pentru a folosi doar variantele disponibile în Badge
type BadgeVariant = "default" | "secondary" | "destructive" | "outline";

const statusConfig: Record<EmailStatus, { label: string; variant: BadgeVariant; className?: string }> = {
  nou: { 
    label: 'Nou', 
    variant: 'default',
    className: 'bg-blue-100 text-blue-800 hover:bg-blue-200'
  },
  in_lucru: { 
    label: 'În lucru', 
    variant: 'secondary',
    className: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
  },
  rezolvat: { 
    label: 'Rezolvat', 
    variant: 'outline',
    className: 'bg-green-100 text-green-800 border-green-300 hover:bg-green-200'
  },
  respins: { 
    label: 'Respins', 
    variant: 'destructive'
  }
};

export function EmailRegistryTable({ emails, onStatusChange, onDelete }: EmailRegistryTableProps) {
  const [selectedEmail, setSelectedEmail] = useState<RegistraturaEmail | null>(null);
  const [editingEmail, setEditingEmail] = useState<RegistraturaEmail | null>(null);
  const [newStatus, setNewStatus] = useState<EmailStatus>('nou');
  const [observatii, setObservatii] = useState('');

  const handleStatusUpdate = async () => {
    if (!editingEmail) return;
    
    await onStatusChange(editingEmail.id, newStatus, observatii);
    setEditingEmail(null);
    setObservatii('');
  };

  const handleDelete = async (id: string) => {
    if (confirm('Sigur doriți să ștergeți această înregistrare?')) {
      await onDelete(id);
    }
  };

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nr. Înregistrare</TableHead>
            <TableHead>Data Primirii</TableHead>
            <TableHead>De la</TableHead>
            <TableHead>Subiect</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Atașamente</TableHead>
            <TableHead>Acțiuni</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {emails.map((email) => (
            <TableRow key={email.id}>
              <TableCell className="font-mono text-sm">
                {email.numarInregistrare}
              </TableCell>
              <TableCell>
                {format(email.dateReceived.toDate(), 'dd MMM yyyy HH:mm', { locale: ro })}
              </TableCell>
              <TableCell className="max-w-[200px] truncate">
                {email.from}
              </TableCell>
              <TableCell className="max-w-[300px] truncate">
                {email.subject}
              </TableCell>
              <TableCell>
                <Badge 
                  variant={statusConfig[email.status].variant}
                  className={statusConfig[email.status].className}
                >
                  {statusConfig[email.status].label}
                </Badge>
              </TableCell>
              <TableCell>
                {email.attachments?.length || 0} fișiere
              </TableCell>
              <TableCell>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setSelectedEmail(email)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setEditingEmail(email);
                      setNewStatus(email.status);
                      setObservatii(email.observatii || '');
                    }}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDelete(email.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Dialog pentru vizualizare email */}
      <Dialog open={!!selectedEmail} onOpenChange={() => setSelectedEmail(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedEmail?.numarInregistrare}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <strong>De la:</strong> {selectedEmail?.from}
            </div>
            <div>
              <strong>Subiect:</strong> {selectedEmail?.subject}
            </div>
            <div>
              <strong>Data primirii:</strong>{' '}
              {selectedEmail && format(selectedEmail.dateReceived.toDate(), 'dd MMMM yyyy HH:mm', { locale: ro })}
            </div>
            <div>
              <strong>Status:</strong>{' '}
              {selectedEmail && (
                <Badge 
                  variant={statusConfig[selectedEmail.status].variant}
                  className={statusConfig[selectedEmail.status].className}
                >
                  {statusConfig[selectedEmail.status].label}
                </Badge>
              )}
            </div>
            {selectedEmail?.observatii && (
              <div>
                <strong>Observații:</strong>
                <p className="mt-1 p-2 bg-muted rounded">{selectedEmail.observatii}</p>
              </div>
            )}
            <div>
              <strong>Conținut:</strong>
              <div 
                className="mt-2 p-4 bg-muted rounded prose max-w-none"
                dangerouslySetInnerHTML={{ 
                  __html: selectedEmail?.bodyHtml || selectedEmail?.body || '' 
                }}
              />
            </div>
            {selectedEmail?.attachments && selectedEmail.attachments.length > 0 && (
              <div>
                <strong>Atașamente:</strong>
                <div className="mt-2 space-y-2">
                  {selectedEmail.attachments.map((att, index) => (
                    <div key={index} className="flex items-center justify-between p-2 border rounded">
                      <span>{att.name}</span>
                      <Button size="sm" asChild>
                        <a href={att.url} target="_blank" rel="noopener noreferrer">
                          <Download className="h-4 w-4 mr-2" />
                          Descarcă
                        </a>
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog pentru editare status */}
      <Dialog open={!!editingEmail} onOpenChange={() => setEditingEmail(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editează Status - {editingEmail?.numarInregistrare}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Status</label>
              <Select value={newStatus} onValueChange={(value) => setNewStatus(value as EmailStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nou">Nou</SelectItem>
                  <SelectItem value="in_lucru">În lucru</SelectItem>
                  <SelectItem value="rezolvat">Rezolvat</SelectItem>
                  <SelectItem value="respins">Respins</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Observații</label>
              <Textarea
                value={observatii}
                onChange={(e) => setObservatii(e.target.value)}
                placeholder="Adaugă observații..."
                rows={4}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditingEmail(null)}>
                Anulează
              </Button>
              <Button onClick={handleStatusUpdate}>
                Salvează
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}