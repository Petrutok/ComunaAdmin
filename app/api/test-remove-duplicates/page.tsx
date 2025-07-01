// app/test-remove-duplicates/page.tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

export default function TestRemoveDuplicates() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const removeDuplicates = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/remove-duplicates', {
        method: 'POST',
      });
      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({ error: 'Failed to call API' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Test Remove Duplicates</h1>
      
      <Button 
        onClick={removeDuplicates} 
        disabled={loading}
        className="mb-4"
      >
        {loading ? 'Processing...' : 'Remove Duplicate Tokens'}
      </Button>

      {result && (
        <pre className="bg-gray-100 p-4 rounded overflow-auto">
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </div>
  );
}