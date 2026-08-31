// Motivatsion iqtiboslar (o'zbekcha). Kuniga bittasi ko'rsatiladi.
export const QUOTES: string[] = [
  "Bugun qilgan mashqing — ertangi kuching.",
  "Zal seni kutmaydi, lekin natija seni kutadi.",
  "Har bir borish — o'zingga bergan va'da.",
  "Dam olish ham reja — lekin dangasalik emas.",
  "Kichik qadamlar katta o'zgarish yasaydi.",
  "Kuchli tana — kuchli iroda demakdir.",
  "Bahona emas, natija to'pla.",
  "Kecha bormagan bo'lsang, bugun bor.",
  "Izchillik iste'doddan kuchliroq.",
  "O'zingni yeng — bu eng katta g'alaba.",
  "Terlagan har tomchi — kelajakdagi mag'rurlik.",
  "Reja bo'yicha yashа, kayfiyat bo'yicha emas.",
];

// Kunning indeksiga qarab barqaror iqtibos tanlaydi (har kuni bir xil).
export function quoteOfDay(d: Date = new Date()): string {
  const start = new Date(d.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((d.getTime() - start.getTime()) / 86400000);
  return QUOTES[dayOfYear % QUOTES.length];
}

// Tez tanlash uchun mushak guruhlari.
export const MUSCLE_PRESETS = [
  "Ko'krak / Trisep",
  "Orqa / Bitsep",
  "Oyoq",
  "Yelka",
  "Qo'l",
  "Press / Kardio",
  "To'liq tana",
];
