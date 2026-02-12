import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

const COLORS = [
  "hsl(153, 60%, 33%)",
  "hsl(33, 90%, 55%)",
  "hsl(210, 70%, 50%)",
  "hsl(340, 65%, 50%)",
  "hsl(270, 55%, 55%)",
  "hsl(180, 50%, 40%)",
  "hsl(45, 80%, 50%)",
  "hsl(0, 60%, 50%)",
];

export default function DashboardPage() {
  const { t } = useI18n();
  const [receipts, setReceipts] = useState<Tables<"receipts">[]>([]);

  useEffect(() => {
    supabase
      .from("receipts")
      .select("*")
      .order("receipt_date", { ascending: false })
      .then(({ data }) => setReceipts(data || []));
  }, []);

  const totalExpenses = receipts.reduce((sum, r) => sum + (r.total_amount || 0), 0);

  const categoryMap: Record<string, number> = {};
  receipts.forEach((r) => {
    const cat = r.category || "other";
    categoryMap[cat] = (categoryMap[cat] || 0) + (r.total_amount || 0);
  });
  const categoryData = Object.entries(categoryMap).map(([name, value]) => ({
    name: (t.categories as Record<string, string>)[name] || name,
    value,
  }));

  const monthMap: Record<string, number> = {};
  receipts.forEach((r) => {
    if (r.receipt_date) {
      const month = r.receipt_date.slice(0, 7);
      monthMap[month] = (monthMap[month] || 0) + (r.total_amount || 0);
    }
  });
  const monthData = Object.entries(monthMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6)
    .map(([month, total]) => ({ month, total }));

  const chartConfig = {
    total: { label: t.total, color: "hsl(153, 60%, 33%)" },
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t.dashboard}</h1>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t.totalExpenses}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-primary">฿{totalExpenses.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t.history}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{receipts.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t.byCategory}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{categoryData.length}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Pie chart */}
        <Card>
          <CardHeader>
            <CardTitle>{t.byCategory}</CardTitle>
          </CardHeader>
          <CardContent>
            {categoryData.length === 0 ? (
              <p className="py-10 text-center text-muted-foreground">{t.noData}</p>
            ) : (
              <div className="h-64">
                <ChartContainer config={{}} className="w-full h-64">
                  <PieChart>
                    <Pie
                      data={categoryData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={90}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {categoryData.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent />} />
                  </PieChart>
                </ChartContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Bar chart */}
        <Card>
          <CardHeader>
            <CardTitle>{t.monthly}</CardTitle>
          </CardHeader>
          <CardContent>
            {monthData.length === 0 ? (
              <p className="py-10 text-center text-muted-foreground">{t.noData}</p>
            ) : (
              <ChartContainer config={chartConfig} className="h-64">
                <BarChart data={monthData}>
                  <XAxis dataKey="month" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="total" fill="var(--color-total)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
