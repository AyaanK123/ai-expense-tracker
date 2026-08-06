# AI Expense Tracker

A production-ready expense tracking app with AI-powered categorization, Supabase auth/database, and an analytics dashboard built with Recharts.

## Tech Stack

- **React 19** + **TypeScript** + **Vite**
- **Tailwind CSS** for styling
- **Supabase** for authentication and PostgreSQL database
- **OpenAI API** (via Supabase Edge Function) for expense categorization
- **Recharts** for spending analytics

## Project Structure

```
src/
├── components/
│   ├── auth/          # Auth forms and route guards
│   ├── dashboard/     # Recharts analytics
│   ├── expenses/      # Expense form and list
│   └── layout/        # App shell and navigation
├── hooks/             # useAuth, useExpenses
├── lib/               # Supabase client, analytics, AI categorization
├── pages/             # Route-level pages
└── types/             # Shared TypeScript types
supabase/
├── migrations/        # PostgreSQL schema + RLS policies
└── functions/         # Edge Function for OpenAI categorization
```

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Run the migration in **SQL Editor**:

   Copy and run `supabase/migrations/001_create_expenses.sql`

3. Enable **Email** auth under Authentication → Providers

### 3. Configure environment variables

```bash
cp .env.example .env
```

Fill in your Supabase URL and anon key from **Project Settings → API**.

### 4. Deploy the AI categorization Edge Function

Install the [Supabase CLI](https://supabase.com/docs/guides/cli), then:

```bash
supabase login
supabase link --project-ref your-project-ref
supabase secrets set OPENAI_API_KEY=sk-your-openai-key
supabase functions deploy categorize-expense
```

The OpenAI key is stored server-side only — never exposed to the browser.

### 5. Run the app

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

## Features

- **Authentication** — Email/password sign up and sign in via Supabase Auth
- **Expense CRUD** — Add, edit, and delete expenses with date, amount, description, and category
- **AI categorization** — Click the sparkle button to auto-categorize via OpenAI (with keyword fallback)
- **Analytics dashboard** — Pie chart by category, bar chart by month, and category breakdown
- **Row-level security** — Users can only access their own expenses

## Scripts

| Command         | Description              |
|-----------------|--------------------------|
| `npm run dev`   | Start development server |
| `npm run build` | Production build         |
| `npm run preview` | Preview production build |
| `npm run lint`  | Run ESLint               |

## License

MIT
