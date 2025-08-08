import { useMutation } from '@tanstack/react-query';
import { generatePDF } from '@/lib/simple-pdf-generator';
import { RequestData } from '@/lib/simple-pdf-generator';

export function useSubmitRequest() {
  return useMutation({
    mutationFn: async (data: RequestData) => {
      const pdfBlob = await generatePDF(data);
      const formData = new FormData();
      
      formData.append('requestData', JSON.stringify(data));
      
      // Handle files based on their structure
      // If files are Base64 encoded objects, convert them to Blobs
      if (data.fisiere && Array.isArray(data.fisiere)) {
        data.fisiere.forEach((file: any) => {
          if (file.content) {
            // It's a Base64 encoded file object
            const byteCharacters = atob(file.content);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
              byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: file.type || 'application/octet-stream' });
            formData.append('files', blob, file.name);
          } else if (file instanceof File) {
            // It's already a File object
            formData.append('files', file);
          }
        });
      }
      
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