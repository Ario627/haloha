# Haloha - Platform Konsultan Bisnis UMKM

Platform konsultan bisnis berbasis AI untuk membantu UMKM (Usaha Mikro, Kecil, dan Menengah) di Indonesia. Dibangun dengan Next.js dan terintegrasi dengan Supabase untuk database dan autentikasi.

## 🌟 Fitur Utama

### 1. Konsultan Bisnis AI
- Chat dengan AI yang memahami konteks bisnis UMKM Indonesia
- Saran yang dipersonalisasi berdasarkan data bisnis Anda
- Topik: Keuangan, Pemasaran, Operasional, SDM, Teknologi, Legal

### 2. Analytics Bisnis
- Pencatatan pendapatan dan pengeluaran
- Analisis tren keuangan
- Insight otomatis untuk pengambilan keputusan
- Visualisasi data per kategori

### 3. Manajemen Data Bisnis
- Profil bisnis lengkap
- Pencatatan tantangan dan tujuan bisnis
- Multi-bisnis per akun

### 4. Keamanan
- Autentikasi dengan Supabase Auth
- Rate limiting untuk perlindungan DDoS
- Input sanitization (XSS, SQL injection prevention)
- Row Level Security (RLS) di database
- Security headers (CSP, HSTS, dll)

## 🚀 Teknologi

- **Framework**: Next.js 16 (App Router)
- **Database**: Supabase (PostgreSQL)
- **Autentikasi**: Supabase Auth
- **AI**: OpenAI GPT-4o-mini
- **Validasi**: Zod
- **Styling**: Tailwind CSS
- **Bahasa**: TypeScript

## 📁 Struktur Proyek

```
src/
├── app/
│   ├── api/
│   │   ├── auth/           # Endpoint autentikasi
│   │   │   ├── signup/     # Registrasi
│   │   │   ├── signin/     # Login
│   │   │   ├── signout/    # Logout
│   │   │   └── callback/   # OAuth callback
│   │   ├── business/       # CRUD data bisnis
│   │   ├── consultant/     # Chat AI konsultan
│   │   └── analytics/      # Analytics & keuangan
│   └── ...
├── lib/
│   ├── supabase/           # Konfigurasi Supabase
│   ├── security/           # Rate limiting, sanitization, auth middleware
│   ├── ai/                 # AI consultant service
│   └── validations.ts      # Zod schemas
├── types/
│   └── database.ts         # TypeScript types
└── middleware.ts           # Security middleware
```

## 🛠️ Setup

### Prerequisites
- Node.js 18+
- Akun Supabase
- OpenAI API Key

### 1. Clone & Install

```bash
git clone <repo-url>
cd haloha
npm install
```

### 2. Setup Supabase

1. Buat project baru di [Supabase](https://supabase.com)
2. Jalankan SQL dari `supabase/schema.sql` di SQL Editor
3. Copy URL dan Keys dari Settings > API

### 3. Setup Environment

```bash
cp .env.example .env.local
```

Edit `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
OPENAI_API_KEY=your_openai_api_key
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### 4. Run Development Server

```bash
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000)

## 📡 API Endpoints

### Autentikasi

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| POST | `/api/auth/signup` | Registrasi user baru |
| POST | `/api/auth/signin` | Login |
| POST | `/api/auth/signout` | Logout |
| GET | `/api/auth/callback` | OAuth callback |

### Bisnis

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | `/api/business` | List semua bisnis user |
| POST | `/api/business` | Buat bisnis baru |
| PATCH | `/api/business` | Update bisnis |
| DELETE | `/api/business?id=<id>` | Hapus bisnis |

### Konsultan AI

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| POST | `/api/consultant` | Kirim pesan ke AI |
| GET | `/api/consultant?action=tips` | Dapatkan quick tips |
| GET | `/api/consultant?action=sessions` | List sesi konsultasi |
| GET | `/api/consultant?action=session&id=<id>` | Detail sesi |

### Analytics

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | `/api/analytics?businessId=<id>` | Dapatkan analytics |
| POST | `/api/analytics` | Tambah revenue/expense |
| DELETE | `/api/analytics?id=<id>&type=<type>` | Hapus record |

## 🔒 Security Features

### Rate Limiting
- Auth endpoints: 10 requests/menit
- Consultant: 20 requests/menit
- General: 60 requests/menit

### Input Validation
- Zod schemas untuk semua input
- HTML entity escaping
- UUID validation

### Headers
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- X-XSS-Protection: 1; mode=block
- Strict-Transport-Security
- Content-Security-Policy

### Database Security
- Row Level Security (RLS) enabled
- User can only access their own data
- Parameterized queries via Supabase client

## 🚀 Deploy ke Vercel

1. Push ke GitHub
2. Import ke [Vercel](https://vercel.com)
3. Set environment variables
4. Deploy!

## 📝 Contoh Request

### Signup
```bash
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "Password123",
    "name": "Nama User"
  }'
```

### Chat dengan Konsultan
```bash
curl -X POST http://localhost:3000/api/consultant \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "message": "Bagaimana cara meningkatkan penjualan online?",
    "context": {
      "topic": "pemasaran"
    }
  }'
```

## 📄 License

Apache License 2.0
