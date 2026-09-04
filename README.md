# FadelyText

Metin araçları ve sahte veri üreticisi. Lorem ipsum, karakter/kelime sayacı, e-posta, isim, adres, telefon ve şifre üretir. Arayüz İngilizce ve Türkçe’dir.

## Gereksinimler

- [Node.js](https://nodejs.org/) 18 veya üzeri
- [pnpm](https://pnpm.io/) (önerilir; `pnpm-lock.yaml` kullanılır)

pnpm yoksa:

```bash
npm install -g pnpm
```

## Kurulum

```bash
cd fadelytext
pnpm install
```

## Çalıştırma

Geliştirme sunucusu:

```bash
pnpm dev
```

Tarayıcıda [http://localhost:3000](http://localhost:3000) adresini açın.

## Ortam değişkenleri

| Değişken | Açıklama | Varsayılan |
|----------|----------|------------|
| `NEXT_PUBLIC_SITE_URL` | Canonical site adresi; Open Graph, `sitemap.xml` ve `robots.txt` için mutlak URL üretir | `http://localhost:3000` |

Üretimde (ör. Vercel) `NEXT_PUBLIC_SITE_URL=https://senin-alanin.com` tanımlayın.

## Diğer komutlar

| Komut | Açıklama |
|--------|----------|
| `pnpm build` | Üretim derlemesi |
| `pnpm start` | Derlemeden sonra production sunucusu (`pnpm build` sonrası) |
| `pnpm lint` | ESLint |

pnpm kullanmak istemezseniz `npm install` ve `npm run dev` de çalışır.

## `ERR_PNPM_MINIMUM_RELEASE_AGE_VIOLATION`

pnpm 11, npm’e yeni düşen paketleri (varsayılan ~24 saat) kurmayı reddeder. Bu yüzden `pnpm install` / `pnpm dev` / `pnpm build` kesilebilir.

Projede `pnpm-workspace.yaml` içinde `minimumReleaseAge: 0` tanımlıdır. Hâlâ hata alırsan:

```bash
pnpm install
```

Next.js’in `sharp` paketi için derleme script’i pnpm 11’de onay ister. Onay `allowBuilds.sharp` ile workspace dosyasındadır. Eksikse:

```bash
pnpm approve-builds sharp
```

## Özellikler

- Lorem ipsum metin üretimi (karakter sayısı, boşluk/özel karakter seçenekleri)
- Karakter, kelime ve satır sayacı
- E-posta, isim, adres, telefon numarası ve şifre üretimi
- Açık / koyu tema
- İngilizce / Türkçe dil desteği

## Proje yapısı

Next.js (App Router) uygulaması. `@/` kök dizine işaret eder (`tsconfig.json` içindeki `paths`).

```
fadelytext/
├── app/                         # Sayfalar ve iskelet
│   ├── layout.tsx               # HTML kabuğu, font, metadata (sekme başlığı)
│   ├── page.tsx                 # Ana sayfa → FadelyTextUI
│   └── globals.css
├── components/                  # Arayüz
│   ├── FadelyTextUI.tsx         # Ana ekran (sekmeler, tema, üret)
│   ├── EmailGenerator.tsx
│   ├── NameGenerator.tsx
│   ├── AddressGenerator.tsx
│   ├── PhoneNumberGenerator.tsx
│   ├── PasswordGenerator.tsx
│   ├── MiscGenerator.tsx
│   └── ui/                      # shadcn bileşenleri (buton, tab, input)
├── data/en ve data/tr           # İsim, e-posta, adres listeleri
├── locales/                     # en.json / tr.json — ekrandaki yazılar
├── hooks/                       # useTranslation, toast vb.
├── lib/utils.ts                 # className birleştirme (cn)
├── public/                      # Statik dosyalar (ikon, svg)
├── package.json                 # Paket adı ve komutlar
└── README.md
```

Akış: `app/layout.tsx` → `app/page.tsx` → `FadelyTextUI` → sekmeler ve üreticiler.

## Proje adını değiştirme

İsim üç (veya dört) ayrı yerde durur; hangisini değiştirdiğine göre sonuç farklıdır.

### 1. npm / pnpm paket adı

`package.json` içindeki `"name"` alanı (şu an `fadelytext`). Küçük harf, boşluksuz olmalıdır. Tarayıcıdaki görünümü değiştirmez.

```json
"name": "fadelytext"
```

### 2. Tarayıcı sekmesi başlığı

`app/layout.tsx` içindeki `metadata`. Örnek:

```ts
export const metadata = {
  title: "FadelyText",
  description: "Metin araçları ve sahte veri üreticisi",
}
```

### 3. Ekranda görünen ürün adı

Header `FadelyTextUI.tsx` içinde `t("textTools")` kullanır. Metinler `locales/en.json` ve `locales/tr.json` içindeki `textTools` anahtarındadır.

- EN: `"textTools": "FadelyText"`
- TR: `"textTools": "FadelyText"` (marka adı çevrilmez)

Bunlar `"FadelyText"` olduğu için header'da marka adı görünür.

### 4. Klasör adı

Klasörü yeniden adlandırman yeterlidir; kod klasör adına bağlı import kullanmaz. Bu README’deki `cd fadelytext` satırını da güncelle.
