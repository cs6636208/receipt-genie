import { useEffect, useState } from "react";
import { Trash2, Download, Image } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Tables } from "@/integrations/supabase/types";

const CATEGORIES = ["food", "groceries", "transport", "health", "entertainment", "utilities", "shopping", "other"];

export default function HistoryPage() {
  const { t } = useI18n();
  const { toast } = useToast();
  const [receipts, setReceipts] = useState<Tables<"receipts">[]>([]);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [items, setItems] = useState<Record<string, Tables<"expense_items">[]>>({});
  const [filter, setFilter] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchData = async () => {
    let query = supabase.from("receipts").select("*").order("receipt_date", { ascending: false });
    if (filter !== "all") query = query.eq("category", filter);
    const { data } = await query;
    const rows = data || [];
    setReceipts(rows);

    // Generate signed URLs for all receipts that have a storage path
    const urlMap: Record<string, string> = {};
    await Promise.all(
      rows.map(async (r) => {
        if (!r.image_url) return;
        // Support both legacy public URLs and new storage paths
        if (r.image_url.startsWith("http")) {
          urlMap[r.id] = r.image_url;
        } else {
          const { data: signed } = await supabase.storage
            .from("receipts")
            .createSignedUrl(r.image_url, 60 * 60); // 1-hour signed URL for display
          if (signed?.signedUrl) urlMap[r.id] = signed.signedUrl;
        }
      })
    );
    setSignedUrls(urlMap);
  };

  useEffect(() => { fetchData(); }, [filter]);

  const loadItems = async (receiptId: string) => {
    if (items[receiptId]) {
      setExpandedId(expandedId === receiptId ? null : receiptId);
      return;
    }
    const { data } = await supabase.from("expense_items").select("*").eq("receipt_id", receiptId);
    setItems((prev) => ({ ...prev, [receiptId]: data || [] }));
    setExpandedId(receiptId);
  };

  const deleteReceipt = async (id: string) => {
    const { error } = await supabase.from("receipts").delete().eq("id", id);
    if (error) {
      toast({ title: t.error, description: error.message, variant: "destructive" });
    } else {
      fetchData();
    }
  };

  const exportCSV = () => {
    if (!receipts.length) return;
    const header = "Store,Date,Category,Total\n";
    const rows = receipts.map((r) => `"${r.store_name}","${r.receipt_date}","${r.category}","${r.total_amount}"`).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "expenses.csv";
    a.click();
  };

  const categoryLabel = (cat: string | null) =>
    cat ? (t.categories as Record<string, string>)[cat] || cat : "—";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t.history}</h1>
        <div className="flex gap-2">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t.allCategories}</SelectItem>
              {CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>{categoryLabel(c)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={exportCSV}>
            <Download className="h-4 w-4 mr-1" />
            {t.export}
          </Button>
        </div>
      </div>

      {receipts.length === 0 ? (
        <p className="py-12 text-center text-muted-foreground">{t.noData}</p>
      ) : (
        receipts.map((r) => (
          <Card key={r.id} className="overflow-hidden">
            <CardContent className="p-4">
              <div
                className="flex cursor-pointer items-center justify-between"
                onClick={() => loadItems(r.id)}
              >
                <div className="flex items-center gap-3">
                  {signedUrls[r.id] ? (
                    <img src={signedUrls[r.id]} alt="" className="h-12 w-12 rounded-lg object-cover" />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
                      <Image className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}
                  <div>
                    <p className="font-semibold">{r.store_name || "—"}</p>
                    <p className="text-xs text-muted-foreground">
                      {r.receipt_date} &middot; {categoryLabel(r.category)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-primary">฿{r.total_amount?.toLocaleString()}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteReceipt(r.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              {expandedId === r.id && items[r.id] && (
                <div className="mt-3 overflow-auto rounded border">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="px-3 py-1.5 text-left">{t.item}</th>
                        <th className="px-3 py-1.5 text-right">{t.qty}</th>
                        <th className="px-3 py-1.5 text-right">{t.price}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items[r.id].map((item) => (
                        <tr key={item.id} className="border-t">
                          <td className="px-3 py-1.5">{item.item_name}</td>
                          <td className="px-3 py-1.5 text-right">{item.quantity}</td>
                          <td className="px-3 py-1.5 text-right">฿{item.total_price?.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
