import { useMutation } from '@tanstack/react-query';
import { generatePDF } from '@/lib/simple-pdf-generator';
import { RequestData } from '@/lib/simple-pdf-generator';

export function useSubmitRequest() {
  return useMutation({
    mutationFn: async (data: RequestData) => {
      const pdfBlob = await generatePDF(data);
      const formData = new FormData();
      
      formData.append('requestData', JSON.stringify(data));
      
      (data.fisiere || []).forEach(file => formData.append('files', file));
      formData.append('pdf', pdfBlob, `cerere_${data.tipCerere}_${Date.now()}.pdf`);

      const res = await fetch('/api/submit-request', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
  });
}
