import React, { createContext, useContext, useState, useCallback } from "react";

type Lang = "th" | "en";

const translations = {
  th: {
    appName: "นักบัญชี AI",
    appDesc: "ถ่ายรูปใบเสร็จ ลงบัญชีให้อัตโนมัติ",
    upload: "อัปโหลดใบเสร็จ",
    dragDrop: "ลากวางรูปใบเสร็จที่นี่ หรือคลิกเพื่อเลือกไฟล์",
    analyzing: "กำลังวิเคราะห์...",
    analyze: "วิเคราะห์ใบเสร็จ",
    save: "บันทึก",
    cancel: "ยกเลิก",
    history: "ประวัติ",
    dashboard: "แดชบอร์ด",
    export: "ส่งออก CSV",
    storeName: "ชื่อร้าน",
    date: "วันที่",
    total: "ยอดรวม",
    category: "หมวดหมู่",
    items: "รายการ",
    item: "สินค้า",
    qty: "จำนวน",
    unitPrice: "ราคาต่อหน่วย",
    price: "ราคา",
    noData: "ยังไม่มีข้อมูล",
    allCategories: "ทุกหมวดหมู่",
    daily: "รายวัน",
    weekly: "รายสัปดาห์",
    monthly: "รายเดือน",
    totalExpenses: "ค่าใช้จ่ายทั้งหมด",
    byCategory: "ตามหมวดหมู่",
    recentExpenses: "รายจ่ายล่าสุด",
    receiptImage: "รูปใบเสร็จ",
    delete: "ลบ",
    confirmDelete: "ยืนยันการลบ?",
    saved: "บันทึกแล้ว!",
    error: "เกิดข้อผิดพลาด",
    categories: {
      food: "อาหาร",
      groceries: "ของใช้",
      transport: "เดินทาง",
      health: "สุขภาพ",
      entertainment: "บันเทิง",
      utilities: "สาธารณูปโภค",
      shopping: "ช้อปปิ้ง",
      other: "อื่นๆ",
    },
  },
  en: {
    appName: "AI Accountant",
    appDesc: "Snap a receipt, auto-log expenses",
    upload: "Upload Receipt",
    dragDrop: "Drag & drop a receipt here, or click to browse",
    analyzing: "Analyzing...",
    analyze: "Analyze Receipt",
    save: "Save",
    cancel: "Cancel",
    history: "History",
    dashboard: "Dashboard",
    export: "Export CSV",
    storeName: "Store Name",
    date: "Date",
    total: "Total",
    category: "Category",
    items: "Items",
    item: "Item",
    qty: "Qty",
    unitPrice: "Unit Price",
    price: "Price",
    noData: "No data yet",
    allCategories: "All Categories",
    daily: "Daily",
    weekly: "Weekly",
    monthly: "Monthly",
    totalExpenses: "Total Expenses",
    byCategory: "By Category",
    recentExpenses: "Recent Expenses",
    receiptImage: "Receipt Image",
    delete: "Delete",
    confirmDelete: "Confirm delete?",
    saved: "Saved!",
    error: "An error occurred",
    categories: {
      food: "Food",
      groceries: "Groceries",
      transport: "Transport",
      health: "Health",
      entertainment: "Entertainment",
      utilities: "Utilities",
      shopping: "Shopping",
      other: "Other",
    },
  },
} as const;

interface I18nContextType {
  lang: Lang;
  t: Record<string, any>;
  toggleLang: () => void;
}

const I18nContext = createContext<I18nContextType | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Lang>("en");
  const toggleLang = useCallback(() => setLang((l) => (l === "th" ? "en" : "th")), []);
  const t = translations[lang] as Record<string, any>;

  return (
    <I18nContext.Provider value={{ lang, t, toggleLang }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}
