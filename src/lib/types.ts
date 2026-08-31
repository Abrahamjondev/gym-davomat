// Bir gym kuni haqidagi ma'lumot
export type Mood = "great" | "good" | "ok" | "tired";

export interface DayEntry {
  date: string; // "YYYY-MM-DD"
  note?: string; // qisqa izoh
  muscle?: string; // mushak guruhi (masalan "Ko'krak / Trisep")
  mood?: Mood; // kayfiyat
  hasPhoto?: boolean; // shu kunga rasm biriktirilganmi (rasmning o'zi alohida saqlanadi)
}

export interface Config {
  weeklyGoal: number; // haftada necha marta borish maqsadi
  ownerName: string; // sahifada ko'rinadigan ism
}

export interface DB {
  days: Record<string, DayEntry>; // kalit = "YYYY-MM-DD"
  config: Config;
}

export const DEFAULT_CONFIG: Config = {
  weeklyGoal: 3,
  ownerName: "ABRHAM",
};
