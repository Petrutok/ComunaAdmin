'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RegistruDocument } from '@/lib/firebase';
import { TIP_DOCUMENT_CONFIG, STATUS_CONFIG } from '@/types/registru';
import { FileText, Mail, MapPin, Calendar, Copy, CheckCircle, Download, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { downloadDocumentPDF } from '@/lib/pdf/generateDocumentPDF';

interface DetaliiDocumentDialogProps {
  document: RegistruDocument;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function DetaliiDocumentDialog({
  document,
  open,
  onOpenChange,
}: DetaliiDocumentDialogProps) {
  const [copiedNumber, setCopiedNumber] = useState(false);
  const [downloadingPDF, setDownloadingPDF] = useState(false);
  const { toast } = useToast();

  const docTypeConfig = TIP_DOCUMENT_CONFIG[document.tipDocument];
  const statusConfig = STATUS_CONFIG[document.status];

  const copyToClipboard = () => {
    navigator.clipboard.writeText(document.numarInregistrare);
    setCopiedNumber(true);
    setTimeout(() => setCopiedNumber(false), 2000);
    toast({
      title: 'Copiat',
      description: 'Numărul a fost copiat în clipboard',
    });
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate?.() || new Date(timestamp);
    return date.toLocaleDateString('ro-RO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleDownloadPDF = async () => {
    try {
      setDownloadingPDF(true);
      await downloadDocumentPDF(document);
      toast({
        title: 'Succes',
        description: 'PDF-ul a fost descărcat',
      });
    } catch (error) {
      console.error('Error downloading PDF:', error);
      toast({
        title: 'Eroare',
        description: 'Nu s-a putut descărca PDF-ul',
        variant: 'destructive',
      });
    } finally {
      setDownloadingPDF(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-800 border-slate-700 max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="sticky top-0 bg-slate-800 z-10 border-b border-slate-700 pb-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1">
              <DialogTitle className="text-white text-2xl flex items-center gap-2 mb-2">
                <FileText className="h-6 w-6 text-blue-400" />
                Detalii Document
              </DialogTitle>
              <p className="text-gray-400 text-sm font-mono">{document.numarInregistrare}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={copyToClipboard}
              className={`${
                copiedNumber
                  ? 'bg-emerald-600/20 text-emerald-300'
                  : 'hover:bg-blue-600/20 hover:text-blue-300'
              } text-gray-300 border border-transparent hover:border-blue-400/30`}
            >
              {copiedNumber ? (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Copiat
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-2" />
                  Copiază
                </>
              )}
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-4 mt-4 pb-4">
          {/* Status Badge */}
          <div className="flex gap-2">
            <Badge className={`${statusConfig.color} text-white px-3 py-1`}>
              <span className="mr-1.5">{statusConfig.icon}</span>
              {statusConfig.label}
            </Badge>
            <Badge className={`${docTypeConfig.color} text-white px-3 py-1`}>
              <span className="mr-1.5">{docTypeConfig.icon}</span>
              {docTypeConfig.label}
            </Badge>
          </div>

          {/* General Information */}
          <Card className="bg-slate-900 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white text-lg flex items-center gap-2">
                📋 INFORMAȚII GENERALE
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-gray-400 text-sm">Numărul de înregistrare:</span>
                  <p className="text-white font-mono font-bold text-lg">{document.numarInregistrare}</p>
                </div>
                <div>
                  <span className="text-gray-400 text-sm">Tip Document:</span>
                  <p className="text-white font-medium">{docTypeConfig.label}</p>
                </div>
                <div>
                  <span className="text-gray-400 text-sm">Data Înregistrării:</span>
                  <p className="text-white font-medium">{formatDate(document.dataInregistrare)}</p>
                </div>
                <div>
                  <span className="text-gray-400 text-sm">Status:</span>
                  <p className="text-white font-medium">{statusConfig.label}</p>
                </div>
              </div>

              {document.numarExtern && (
                <div className="pt-2 border-t border-slate-700">
                  <span className="text-gray-400 text-sm">Numărul extern:</span>
                  <p className="text-white font-medium">{document.numarExtern}</p>
                </div>
              )}

              {document.dataExterna && (
                <div>
                  <span className="text-gray-400 text-sm">Data externă:</span>
                  <p className="text-white font-medium">{document.dataExterna}</p>
                </div>
              )}

              {document.departament && (
                <div>
                  <span className="text-gray-400 text-sm">Departament responsabil:</span>
                  <p className="text-white font-medium">{document.departament}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Sender Information */}
          <Card className="bg-slate-900 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white text-lg flex items-center gap-2">
                👤 EMITENT (Expeditor)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <span className="text-gray-400 text-sm">Nume:</span>
                <p className="text-white font-medium">{document.emitent}</p>
              </div>
              {document.adresaEmitent && (
                <div>
                  <span className="text-gray-400 text-sm flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> Adresă:
                  </span>
                  <p className="text-white font-medium">{document.adresaEmitent}</p>
                </div>
              )}
              {document.emailEmitent && (
                <div>
                  <span className="text-gray-400 text-sm flex items-center gap-1">
                    <Mail className="h-3 w-3" /> Email:
                  </span>
                  <p className="text-white font-medium break-all">{document.emailEmitent}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recipient Information */}
          <Card className="bg-slate-900 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white text-lg flex items-center gap-2">
                📨 DESTINATAR
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <span className="text-gray-400 text-sm">Nume:</span>
                <p className="text-white font-medium">{document.destinatar}</p>
              </div>
              {document.adresaDestinatar && (
                <div>
                  <span className="text-gray-400 text-sm flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> Adresă:
                  </span>
                  <p className="text-white font-medium">{document.adresaDestinatar}</p>
                </div>
              )}
              {document.emailDestinatar && (
                <div>
                  <span className="text-gray-400 text-sm flex items-center gap-1">
                    <Mail className="h-3 w-3" /> Email:
                  </span>
                  <p className="text-white font-medium break-all">{document.emailDestinatar}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Content */}
          <Card className="bg-slate-900 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white text-lg">📝 CONȚINUT</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-300 whitespace-pre-wrap text-sm leading-relaxed">
                {document.continut}
              </p>
            </CardContent>
          </Card>

          {/* Notes */}
          {document.observatii && (
            <Card className="bg-yellow-950/20 border-yellow-800/30">
              <CardHeader>
                <CardTitle className="text-yellow-400 text-lg">💬 OBSERVAȚII</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-yellow-200 whitespace-pre-wrap text-sm">
                  {document.observatii}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Attachments */}
          {document.attachments && document.attachments.length > 0 && (
            <Card className="bg-slate-900 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white text-lg">
                  📎 DOCUMENTE ATAȘATE ({document.attachments.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {document.attachments.map((attachment, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-slate-800/50 rounded border border-slate-600/30 hover:border-slate-500/50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium truncate">{attachment.fileName}</p>
                      <p className="text-gray-400 text-xs">
                        {(attachment.fileSize / 1024).toFixed(2)} KB
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => window.open(attachment.downloadURL, '_blank')}
                      className="hover:bg-blue-600/20 hover:text-blue-300 text-gray-300 ml-2"
                    >
                      ⬇️ Descarcă
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* History */}
          <Card className="bg-slate-900 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white text-lg">🕒 ISTORIC</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-start gap-2">
                <span className="text-gray-400">⏰ Creat:</span>
                <div>
                  <p className="text-white font-medium">{formatDate(document.createdAt)}</p>
                  <p className="text-gray-500 text-xs">
                    de {document.creatDeNume} ({document.creatDe})
                  </p>
                </div>
              </div>
              {document.updatedAt && (
                <div className="flex items-start gap-2 pt-2 border-t border-slate-700">
                  <span className="text-gray-400">📝 Ultimul update:</span>
                  <p className="text-white font-medium">{formatDate(document.updatedAt)}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <DialogFooter className="border-t border-slate-700 pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Închide
          </Button>
          <Button
            onClick={handleDownloadPDF}
            disabled={downloadingPDF}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {downloadingPDF ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Se descarcă...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Descarcă PDF
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
