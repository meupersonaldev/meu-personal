# Project Structure

## Root Layout
```
meu-personal/
├── apps/
│   ├── web/          # Next.js frontend
│   └── api/          # Express.js backend
├── docs/             # Documentation
├── scripts/          # Utility scripts
└── package.json      # Monorepo root config
```

## Frontend (apps/web)

### App Router Structure
```
app/
├── aluno/            # Student portal routes
│   ├── agendar/      # Booking page
│   ├── dashboard/    # Student dashboard
│   ├── historico/    # Booking history
│   ├── login/        # Student login
│   └── ...
├── professor/        # Teacher portal routes
│   ├── agenda/       # Schedule management
│   ├── alunos/       # Student management
│   ├── carteira/     # Wallet/earnings
│   ├── disponibilidade/ # Availability settings
│   └── ...
├── franquia/         # Franchise admin routes
│   └── dashboard/    # Franchise management
├── franqueadora/     # Franchisor admin routes
│   └── dashboard/    # Multi-franchise management
├── legal/            # Legal pages (terms, privacy)
└── layout.tsx        # Root layout
```

### Key Frontend Directories
```
components/
├── ui/               # Base UI components (shadcn/ui style)
├── auth/             # Auth-related components
├── mobile/           # Mobile-specific components
├── modals/           # Modal dialogs
├── student/          # Student-specific components
├── teacher/          # Teacher-specific components
└── ...

lib/
├── stores/           # Zustand stores
├── hooks/            # Custom React hooks
├── utils/            # Utility functions
├── api.ts            # API client
├── supabase.ts       # Supabase client
└── ...
```

## Backend (apps/api)

### Source Structure
```
src/
├── routes/           # Express route handlers (one file per domain)
│   ├── auth.ts
│   ├── bookings.ts
│   ├── teachers.ts
│   ├── students.ts
│   ├── franchises.ts
│   ├── payments.ts
│   └── ...
├── services/         # Business logic services
│   ├── asaas.service.ts
│   ├── email.service.ts
│   ├── booking-canonical.service.ts
│   └── ...
├── middleware/       # Express middleware
│   ├── auth.ts       # JWT authentication
│   ├── rateLimit.ts  # Rate limiting
│   ├── validation.ts # Request validation
│   └── ...
├── jobs/             # Background schedulers
│   ├── booking-scheduler.ts
│   ├── reservation-processor.ts
│   └── teacher-availability-scheduler.ts
├── lib/              # Shared utilities
├── config/           # Configuration
└── server.ts         # Express app entry point
```

### Database & Migrations
```
prisma/
├── schema.prisma     # Prisma schema definition
└── migrations/       # Prisma migrations

migrations/           # Raw SQL migrations (Supabase)
```

## Naming Conventions
- Routes: kebab-case (`booking-series.ts`)
- Components: PascalCase (`MobileBottomNav.tsx`)
- Hooks: camelCase with `use` prefix (`useTeacherApproval.ts`)
- Stores: kebab-case with `-store` suffix (`auth-store.ts`)
- Pages: `page.tsx` in route folders (Next.js App Router convention)

## Role-Based Route Prefixes
- `/aluno/*` - Student-facing pages
- `/professor/*` - Teacher-facing pages
- `/franquia/*` - Franchise admin pages
- `/franqueadora/*` - Franchisor admin pages
