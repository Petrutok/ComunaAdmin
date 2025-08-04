'use client';
import { useDropzone } from 'react-dropzone';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FileUploadProps {
  max?: number;
  value: File[];
  onChange: (files: File[]) => void;
}

export function FileUpload({ max = 3, value, onChange }: FileUploadProps) {
  const { getRootProps, getInputProps } = useDropzone({
    maxFiles: max,
    accept: {
      'image/*': [],
      'application/pdf': [],
      'application/msword': [],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': [],
    },
    onDrop: accepted => onChange([...value, ...accepted].slice(0, max)),
  });

  const remove = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  return (
    <div>
      <div
        {...getRootProps({
          className: 'border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:bg-muted',
        })}
      >
        <input {...getInputProps()} />
        <p>Trage fișierele aici sau click pentru a selecta (max {max})</p>
      </div>
      {value.length > 0 && (
        <ul className="mt-2 space-y-1">
          {value.map((file, i) => (
            <li key={i} className="flex justify-between items-center text-sm">
              <span>{file.name}</span>
              <Button variant="ghost" size="sm" onClick={() => remove(i)}>
                <X className="h-4 w-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
