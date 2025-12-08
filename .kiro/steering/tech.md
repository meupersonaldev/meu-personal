# Tech Stack & Build System

## Monorepo Structure
- npm workspaces with two main apps: `apps/web` (frontend) and `apps/api` (backend)

## Frontend (apps/web)
- **Framework**: Next.js 15 with App Router and Turbopack
- **React**: 19.1.0
- **Styling**: Tailwind CSS 3.4 + tailwindcss-animate
- **UI Components**: Radix UI primitives + custom components (shadcn/ui pattern)
- **State Management**: Zustand
- **Data Fetching**: TanStack React Query + Axios
- **Forms**: React Hook Form + Zod validation
- **Icons**: Lucide React
- **Date Handling**: date-fns + date-fns-tz

## Backend (apps/api)
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript (compiled with tsx for dev, tsc for build)
- **Database**: PostgreSQL via Supabase
- **ORM**: Prisma (schema at `apps/api/prisma/schema.prisma`)
- **Auth**: JWT + Supabase Auth
- **Validation**: Zod
- **Caching**: Redis (ioredis)
- **Email**: Resend + Nodemailer
- **Payments**: Asaas API (Brazilian payment gateway)
- **Security**: Helmet, CORS, rate limiting

## Database
- PostgreSQL hosted on Supabase
- Prisma for schema management and migrations
- Raw SQL migrations in `apps/api/migrations/` and `apps/api/prisma/migrations/`

## Common Commands

### Development
```bash
# Root - start both frontend and backend
npm run dev

# Frontend only (from apps/web)
npm run dev

# Backend only (from apps/api)
npm run dev
```

### Build
```bash
# Build all workspaces
npm run build

# Build frontend only
npm run build --workspace=web

# Build backend only
npm run build --workspace=api
```

### Database
```bash
# Push schema changes to database
npm run db:push

# Open Prisma Studio
npm run db:studio

# Generate Prisma client
npm run prisma:generate --workspace=api
```

### Testing
```bash
# Run tests (from apps/api)
npm run test

# Run property-based tests
npm run test:property
```

### Linting
```bash
npm run lint
```

## Environment Variables
- Frontend: `apps/web/.env.local` (NEXT_PUBLIC_* prefix for client-side)
- Backend: `apps/api/.env`
- Key variables: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ASAAS_API_KEY, JWT_SECRET

## Deployment
- Docker support via Dockerfiles in each app
- Standalone Next.js output for containerization
- EasyPanel configuration available
