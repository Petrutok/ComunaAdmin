'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Smartphone, Trash2, Send } from 'lucide-react';

export default function DebugNotificationsPage() {
  const [tokens, setTokens] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadTokens();
  }, []);

  const loadTokens = async () => {
    try {
      const q = query(
        collection(db, 'fcm_tokens'),
        where('active', '==', true)
      );
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setTokens(data);
    } catch (error) {
      console.error('Error loading tokens:', error);
    } finally {
      setLoading(false);
    }
  };

  const testSingleToken = async (tokenId: string) => {
    setSending(tokenId);
    try {
      const response = await fetch('/api/test-single-notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tokenId }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        toast({
          title: "Notificare trimisă!",
          description: `Trimisă cu succes la ${result.platform}`,
        });
      } else {
        toast({
          title: "Eroare",
          description: result.error || "Nu s-a putut trimite",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Eroare",
        description: "Eroare de rețea",
        variant: "destructive",
      });
    } finally {
      setSending(null);
    }
  };

  const removeDuplicates = async () => {
    try {
      const response = await fetch('/api/remove-duplicates', {
        method: 'POST',
      });
      const result = await response.json();
      
      toast({
        title: "Duplicate eliminate",
        description: `${result.deactivatedCount} token-uri dezactivate`,
      });
      
      loadTokens();
    } catch (error) {
      toast({
        title: "Eroare",
        description: "Nu s-au putut elimina duplicatele",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <div className="p-8 text-center">Se încarcă...</div>;
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-white">Debug Notificări</h1>
        <Button onClick={removeDuplicates} variant="destructive">
          <Trash2 className="h-4 w-4 mr-2" />
          Elimină Duplicate
        </Button>
      </div>

      <div className="grid gap-4">
        {tokens.map((token) => (
          <Card key={token.id} className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Smartphone className="h-5 w-5" />
                {token.platform === 'ios' ? 'iPhone' : 'Web'} - {token.id}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm text-gray-400">
                <p>Token: {token.token?.substring(0, 20)}...</p>
                <p>User Agent: {token.userAgent?.substring(0, 50)}...</p>
                <p>Creat: {new Date(token.createdAt?.seconds * 1000).toLocaleString('ro-RO')}</p>
              </div>
              <Button
                onClick={() => testSingleToken(token.id)}
                disabled={sending === token.id}
                className="mt-4"
                size="sm"
              >
                {sending === token.id ? (
                  "Se trimite..."
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Test Notificare
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}