'use client';

// Per-category response templates, stored in config/raspuns_templates.
// The text edited here becomes the middle section of the prefilled
// official response (header + legal footer are added automatically by
// buildRaspunsBody). [ ... ] marks the blanks the clerk fills per case.

import { useEffect, useState } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, FileText } from 'lucide-react';
import { RASPUNS_CATEGORY_LABELS, DEFAULT_RASPUNS_CORP } from '@/lib/raspuns';

export default function SabloaneRaspunsPage() {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const snap = await getDoc(doc(db, 'config', 'raspuns_templates'));
        setTemplates((snap.data() as Record<string, string>) || {});
      } catch (error) {
        console.error('Error loading templates:', error);
        toast({
          title: 'Eroare',
          description: 'Nu s-au putut încărca șabloanele',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [toast]);

  const save = async (category: string) => {
    setSavingKey(category);
    try {
      await setDoc(
        doc(db, 'config', 'raspuns_templates'),
        { [category]: templates[category] || '' },
        { merge: true }
      );
      toast({
        title: 'Șablon salvat',
        description: `${RASPUNS_CATEGORY_LABELS[category]} — se aplică imediat la răspunsurile noi.`,
      });
    } catch (error) {
      console.error('Error saving template:', error);
      toast({
        title: 'Eroare',
        description: 'Nu s-a putut salva șablonul',
        variant: 'destructive',
      });
    } finally {
      setSavingKey(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <FileText className="h-7 w-7 text-sky-400" />
          Șabloane de răspuns pe categorii
        </h1>
        <p className="text-gray-400 text-sm mt-2 max-w-3xl">
          Textul de aici apare precompletat în dialogul „Trimite răspuns oficial" pentru cererile din
          categoria respectivă. Antetul (Către, numărul cererii) și temeiul legal (OG 27/2002, calea de
          atac) se adaugă automat — scrie doar conținutul răspunsului. Marchează cu{' '}
          <code className="text-amber-300">[ ... ]</code> locurile care se completează de la caz la caz.
          Categoriile fără șablon folosesc textul standard.
        </p>
      </div>

      {Object.entries(RASPUNS_CATEGORY_LABELS).map(([category, label]) => (
        <Card key={category} className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white text-lg flex items-center justify-between gap-3">
              {label}
              {!templates[category]?.trim() && (
                <span className="text-xs font-normal text-gray-500">folosește textul standard</span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              value={templates[category] || ''}
              onChange={(e) => setTemplates((prev) => ({ ...prev, [category]: e.target.value }))}
              rows={6}
              placeholder={DEFAULT_RASPUNS_CORP}
              className="bg-slate-900 border-slate-600 text-white font-mono text-sm"
            />
            <div className="flex justify-end">
              <Button
                onClick={() => save(category)}
                disabled={savingKey === category}
                className="bg-sky-600 hover:bg-sky-700"
              >
                {savingKey === category ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Salvează
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
