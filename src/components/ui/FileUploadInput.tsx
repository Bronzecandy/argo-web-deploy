'use client';

import { useMemo, useRef, useState, useCallback } from 'react';
import { Upload, X, CheckCircle } from 'lucide-react';
import { blobService } from '@/src/services/blob.service';
import { BLOB_URL } from '@/src/lib/constants';
import WalrusFallbackImg from '@/src/components/ui/WalrusFallbackImg';
import ExpandableImage from '@/src/components/ui/ExpandableImage';
import { toast } from 'sonner';

interface FileUploadInputProps {
  label?: string;
  value: string;
  onChange: (blobId: string) => void;
  accept?: string;
  placeholder?: string;
  disabled?: boolean;
  /** Preview source: Walrus aggregator vs in-app blob storage. */
  previewSource?: 'walrus' | 'api';
}

export default function FileUploadInput({
  label,
  value,
  onChange,
  accept = 'image/*',
  placeholder = 'Upload file or paste blob ID',
  disabled = false,
  previewSource = 'walrus',
}: FileUploadInputProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const previewUrlApi = useMemo(() => {
    if (!value.trim()) return '';
    const isImageAccept = accept.includes('image') || accept === 'image/*';
    if (!isImageAccept) return '';
    return previewSource === 'api' ? BLOB_URL(value.trim()) : '';
  }, [value, accept, previewSource]);

  const showWalrusPreview =
    !!value.trim() &&
    (accept.includes('image') || accept === 'image/*') &&
    previewSource === 'walrus';

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setUploading(true);
      try {
        const blobId = await blobService.upload(file);
        onChange(blobId);
        toast.success('File uploaded');
      } catch (err) {
        console.error(err);
        toast.error(err instanceof Error ? err.message : 'Upload failed');
      } finally {
        setUploading(false);
        if (fileRef.current) fileRef.current.value = '';
      }
    },
    [onChange],
  );

  return (
    <div>
      {label && <label className="mb-1 block text-xs font-medium text-slate-500">{label}</label>}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            disabled={disabled || uploading}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 pr-8 text-sm focus:border-blue-800 focus:outline-none focus:ring-1 focus:ring-blue-800 disabled:opacity-50"
          />
          {value && (
            <button
              type="button"
              onClick={() => onChange('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={disabled || uploading}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          {uploading ? (
            <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-blue-800 border-t-transparent" />
          ) : value ? (
            <CheckCircle className="h-3.5 w-3.5 text-blue-800" />
          ) : (
            <Upload className="h-3.5 w-3.5" />
          )}
          {uploading ? 'Uploading...' : 'Browse'}
        </button>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept={accept}
        onChange={handleFileChange}
        className="hidden"
      />
      {showWalrusPreview && (
        <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-2">
          <p className="mb-2 text-[10px] font-medium uppercase tracking-wide text-slate-500">Preview</p>
          <WalrusFallbackImg
            blobId={value.trim()}
            alt=""
            className="max-h-48 max-w-full rounded-md object-contain"
          />
        </div>
      )}
      {previewUrlApi && (
        <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-2">
          <p className="mb-2 text-[10px] font-medium uppercase tracking-wide text-slate-500">Preview</p>
          <ExpandableImage src={previewUrlApi} alt="" className="max-h-48 max-w-full rounded-md object-contain" />
        </div>
      )}
    </div>
  );
}
