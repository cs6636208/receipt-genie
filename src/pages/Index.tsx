import { useState, useCallback } from "react";
import { Upload, Loader2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { v4 as uuidv4 } from "uuid";

interface ReceiptItem {
  item_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  category: string;
}

interface ReceiptData {
  store_name: string;
  receipt_date: string;
  items: ReceiptItem[];
  total_amount: number;
  category: string;
}

export default function Index() {
  const { t } = useI18n();
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<ReceiptData | null>(null);

  const handleFile = useCallback((f: File) => {
    setFile(f);
    setResult(null);
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(f);
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const f = e.dataTransfer.files[0];
      if (f?.type.startsWith("image/")) handleFile(f);
    },
    [handleFile]
  );

  const analyze = async () => {
    if (!file) return;
    setLoading(true);
    try {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve) => {
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(",")[1]);
        };
        reader.readAsDataURL(file);
      });

      const { data, error } = await supabase.functions.invoke("analyze-receipt", {
        body: { imageBase64: base64 },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setResult(data.data);
    } catch (err: any) {
      toast({ title: t.error, description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const saveReceipt = async () => {
    if (!result || !file) return;
    setSaving(true);
    try {
      // Upload image to storage
      const ext = file.name.split(".").pop();
      const path = `${uuidv4()}.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from("receipts")
        .upload(path, file);
      if (uploadErr) throw uploadErr;

      const { data: urlData } = supabase.storage.from("receipts").getPublicUrl(path);

      // Insert receipt
      const { data: receipt, error: insertErr } = await supabase
        .from("receipts")
        .insert({
          store_name: result.store_name,
          receipt_date: result.receipt_date,
          total_amount: result.total_amount,
          category: result.category,
          image_url: urlData.publicUrl,
          raw_ai_response: result as any,
        })
        .select()
        .single();

      if (insertErr) throw insertErr;
      
      if (result.items?.length) {
        const { error: itemsErr } = await supabase.from("expense_items").insert(
          result.items.map((item) => ({
            receipt_id: receipt.id,
            item_name: item.item_name,
            quantity: item.quantity,
            unit_price: item.unit_price,
            total_price: item.total_price,
            category: item.category,
          }))
        );
        if (itemsErr) throw itemsErr;
      }

      toast({ title: t.saved });
      setFile(null);
      setPreview(null);
      setResult(null);
    } catch (err: any) {
      toast({ title: t.error, description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const categoryLabel = (cat: string) =>
    (t.categories as Record<string, string>)[cat] || cat;

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight">{t.appName}</h1>
        <p className="mt-1 text-muted-foreground">{t.appDesc}</p>
      </div>

      {/* Upload zone */}
      <Card>
        <CardContent className="p-6">
          <label
            onDrop={onDrop}
            onDragOver={(e) => e.preventDefault()}
            className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 p-10 transition-colors hover:border-primary/60 hover:bg-primary/10"
          >
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
            {preview ? (
              <img
                src={preview}
                alt="Receipt preview"
                className="max-h-64 rounded-lg object-contain"
              />
            ) : (
              <>
                <Upload className="h-10 w-10 text-primary/60" />
                <p className="text-sm text-muted-foreground">{t.dragDrop}</p>
              </>
            )}
          </label>
          {file && !result && (
            <Button
              onClick={analyze}
              disabled={loading}
              className="mt-4 w-full"
              size="lg"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t.analyzing}
                </>
              ) : (
                t.analyze
              )}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* AI Result */}
      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>{result.store_name || "—"}</span>
              <span className="rounded-full bg-accent/20 px-3 py-1 text-sm font-medium text-accent-foreground">
                {categoryLabel(result.category)}
              </span>
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {result.receipt_date} &middot; {t.total}: ฿{result.total_amount?.toLocaleString()}
            </p>
          </CardHeader>
          <CardContent>
            <div className="overflow-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">{t.item}</th>
                    <th className="px-3 py-2 text-right font-medium">{t.qty}</th>
                    <th className="px-3 py-2 text-right font-medium">{t.price}</th>
                    <th className="px-3 py-2 text-left font-medium">{t.category}</th>
                  </tr>
                </thead>
                <tbody>
                  {result.items?.map((item, i) => (
                    <tr key={i} className="border-t">
                      <td className="px-3 py-2">{item.item_name}</td>
                      <td className="px-3 py-2 text-right">{item.quantity}</td>
                      <td className="px-3 py-2 text-right">฿{item.total_price?.toLocaleString()}</td>
                      <td className="px-3 py-2">{categoryLabel(item.category)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 flex gap-2">
              <Button onClick={saveReceipt} disabled={saving} className="flex-1">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                {t.save}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setResult(null);
                  setFile(null);
                  setPreview(null);
                }}
              >
                <X className="h-4 w-4" />
                {t.cancel}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
