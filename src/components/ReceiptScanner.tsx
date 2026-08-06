import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Camera, Loader2 } from 'lucide-react';

interface ReceiptScannerProps {
  onScanComplete: (data: { amount?: number; date?: string; category?: string; merchant?: string }) => void;
}

export default function ReceiptScanner({ onScanComplete }: ReceiptScannerProps) {
  const [loading, setLoading] = useState(false);

  async function handleReceiptUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);

    try {
      const filePath = `receipts/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('receipts')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from('receipts')
        .getPublicUrl(filePath);

      const uploadedReceiptUrl = publicUrlData.publicUrl;

      const { data, error } = await supabase.functions.invoke('parse-receipt', {
        body: { imageUrl: uploadedReceiptUrl }
      });

      if (error) throw error;

      if (data) {
        onScanComplete(data);
      }
    } catch (err) {
      console.error("Error processing receipt:", err);
      alert("Failed to scan receipt with AI. Please try filling details manually.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center justify-between border-2 border-dashed border-slate-300 p-4 rounded-2xl bg-white shadow-sm mb-4">
      <span className="text-sm font-medium text-slate-600">Scan receipt with AI</span>
      <label className="cursor-pointer flex items-center gap-2 bg-brand-600 text-white px-4 py-2 rounded-xl hover:bg-brand-700 transition shadow-sm font-medium text-sm">
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
        <span>{loading ? "Scanning..." : "Upload Receipt"}</span>
        <input type="file" accept="image/*" className="hidden" onChange={handleReceiptUpload} disabled={loading} />
      </label>
    </div>
  );
}

export default ReceiptScanner;