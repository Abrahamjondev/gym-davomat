# Gym Davomat 🏋️

Shaxsiy gym davomati sayti. **Hamma ko'ra oladi**, lekin **faqat egasi** (PIN bilan) belgilay oladi.

## Xususiyatlar
- Oylik kalendar + yillik heatmap (gym kunlari qora, boshqacha dizaynda)
- Statistika: jami, bu oy/yil, so'nggi 30 kun, o'rtacha oraliq
- **Haftalik streak** (ketma-ket kunlar emas — kun oralatib borishga moslashtirilgan)
- Haftalik maqsad + progress
- Achievement nishonlari (1 / 7 / 30 / 50 / 100 mashg'ulot)
- Har kunga izoh, mushak guruhi, kayfiyat
- Davomat qo'yganda confetti animatsiyasi
- Mehmonlar faqat ko'radi — hech narsani o'zgartira olmaydi

## Texnologiya
Next.js 16 (App Router) · React 19 · Tailwind v4 · Upstash Redis

## Lokal ishga tushirish
```bash
npm install
npm run dev
```
`.env.local` da `OWNER_PIN` ni o'zgartiring. Upstash sozlanmagan bo'lsa, ma'lumot lokal `.data/db.json` ga yoziladi.

## Vercel'ga deploy
1. Loyihani GitHub'ga push qiling.
2. [vercel.com](https://vercel.com) da "New Project" → repozitoriyni tanlang.
3. [Upstash](https://console.upstash.com) da bepul Redis bazasi oching → REST URL va TOKEN oling.
4. Vercel'da **Environment Variables** ga qo'shing:
   - `OWNER_PIN` — maxfiy PIN
   - `AUTH_SECRET` — uzun tasodifiy satr
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`
5. Deploy. Tayyor!
