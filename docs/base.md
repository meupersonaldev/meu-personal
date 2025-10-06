Prompt Completo para Criação da Base do Projeto Meu Personal
📋 Contexto e Objetivo
Você é um desenvolvedor senior fullstack especializado em Next.js, TypeScript e arquitetura escalável. Sua missão é criar a base completa de um MVP para o projeto "Meu Personal" - uma plataforma web responsiva (mobile-first) que conecta professores e alunos para aulas personalizadas em academias franqueadas.
🎨 Especificações de Design
Paleta de Cores (Use EXATAMENTE estes valores):
css/* Cores Principais */
--primary-dark: #002C4E;      /* Headers, backgrounds institucionais */
--accent-yellow: #FFF373;     /* CTAs, botões primários */
--accent-cyan: #27DFFF;       /* Legacy, usar com moderação */

/* Neutros */
--black: #111111;
--gray-dark: #3F3F46;
--gray-medium: #71717A;
--gray-light: #D4D4D8;
--gray-lighter: #F4F4F5;
--white: #FFFFFF;
--text-primary: #202020;

/* Semânticas */
--success: #1F8A70;
--warning: #C58F00;
--error: #B3261E;
--info: #2563EB;
Tipografia:
css/* Fonte: Montserrat */
--font-h1: 600 20px/130% 'Montserrat';  /* Semibold */
--font-h2: 600 20px/130% 'Montserrat';  /* Semibold */
--font-body: 400 16px/150% 'Montserrat'; /* Regular */
--letter-spacing-heading: 0.4px;
--letter-spacing-body: 0.32px;
🚀 INSTRUÇÕES PASSO A PASSO
PASSO 1: Setup Inicial do Monorepo
bash# 1.1 - Criar estrutura base do monorepo
mkdir meu-personal && cd meu-personal
npm init -y

# 1.2 - Configurar workspaces no package.json principal
Criar arquivo package.json na raiz:
json{
  "name": "meu-personal",
  "version": "1.0.0",
  "private": true,
  "workspaces": [
    "apps/*",
    "packages/*"
  ],
  "scripts": {
    "dev": "npm run dev --workspace=web & npm run dev --workspace=api",
    "build": "npm run build --workspaces",
    "lint": "npm run lint --workspaces",
    "clean": "rm -rf node_modules apps/*/node_modules packages/*/node_modules"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "typescript": "^5.5.0",
    "prettier": "^3.3.0",
    "eslint": "^8.57.0"
  }
}
bash# 1.3 - Criar estrutura de diretórios
mkdir -p apps/web apps/api packages/ui packages/shared packages/database packages/config
PASSO 2: Configurar Frontend (Next.js 15)
bash# 2.1 - Criar Next.js app
cd apps/web
npx create-next-app@latest . --typescript --tailwind --app --no-src-dir --import-alias "@/*"
bash# 2.2 - Instalar dependências essenciais
npm install @tanstack/react-query@^5.0.0 \
            zustand@^4.5.0 \
            axios@^1.7.0 \
            react-hook-form@^7.50.0 \
            zod@^3.23.0 \
            @hookform/resolvers@^3.9.0 \
            date-fns@^3.6.0 \
            date-fns-tz@^3.1.0 \
            react-qr-code@^2.0.12 \
            qrcode@^1.5.3 \
            lucide-react@^0.400.0 \
            sonner@^1.5.0 \
            clsx@^2.1.0 \
            tailwind-merge@^2.3.0 \
            @radix-ui/react-dialog@^1.0.5 \
            @radix-ui/react-dropdown-menu@^2.0.6 \
            @radix-ui/react-label@^2.0.2 \
            @radix-ui/react-select@^2.0.0 \
            @radix-ui/react-slot@^1.0.2 \
            @radix-ui/react-tabs@^1.0.4 \
            @radix-ui/react-toast@^1.1.5 \
            class-variance-authority@^0.7.0 \
            tailwindcss-animate@^1.0.7

# 2.3 - Instalar dependências de desenvolvimento
npm install -D @types/react@^18.3.0 \
               @types/react-dom@^18.3.0 \
               @types/qrcode@^1.5.5
PASSO 3: Criar Estrutura de Pastas do Frontend
bash# 3.1 - Criar estrutura completa
cd apps/web
mkdir -p app/\(auth\)/{login,cadastro,esqueci-senha}
mkdir -p app/\(dashboard\)/professor/{dashboard,agenda,perfil,creditos,aulas}
mkdir -p app/\(dashboard\)/aluno/{inicio,buscar,aulas,perfil,creditos}
mkdir -p app/\(dashboard\)/admin/{dashboard,professores,alunos,pacotes,relatorios}
mkdir -p components/{ui,layout,forms,dashboard,common}
mkdir -p lib/{api,hooks,utils,stores,validations}
mkdir -p styles
mkdir -p public/images
mkdir -p types
PASSO 4: Configurar Tailwind CSS com Design System
Criar arquivo apps/web/tailwind.config.ts:
typescriptimport type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: '1rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      colors: {
        border: '#D4D4D8',
        input: '#D4D4D8',
        ring: '#27DFFF',
        background: '#FFFFFF',
        foreground: '#202020',
        primary: {
          DEFAULT: '#002C4E',
          foreground: '#FFFFFF',
        },
        secondary: {
          DEFAULT: '#F4F4F5',
          foreground: '#202020',
        },
        accent: {
          DEFAULT: '#FFF373',
          foreground: '#002C4E',
          cyan: '#27DFFF',
        },
        muted: {
          DEFAULT: '#F4F4F5',
          foreground: '#71717A',
        },
        destructive: {
          DEFAULT: '#B3261E',
          foreground: '#FFFFFF',
        },
        success: {
          DEFAULT: '#1F8A70',
          foreground: '#FFFFFF',
        },
        warning: {
          DEFAULT: '#C58F00',
          foreground: '#FFFFFF',
        },
        info: {
          DEFAULT: '#2563EB',
          foreground: '#FFFFFF',
        },
        gray: {
          50: '#F4F4F5',
          100: '#D4D4D8',
          400: '#71717A',
          600: '#3F3F46',
          900: '#111111',
        },
      },
      fontFamily: {
        sans: ['Montserrat', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        'heading-1': ['20px', { lineHeight: '130%', letterSpacing: '0.4px', fontWeight: '600' }],
        'heading-2': ['20px', { lineHeight: '130%', letterSpacing: '0.4px', fontWeight: '600' }],
        'body': ['16px', { lineHeight: '150%', letterSpacing: '0.32px', fontWeight: '400' }],
      },
      borderRadius: {
        sm: '8px',
        DEFAULT: '12px',
        lg: '16px',
      },
      spacing: {
        xs: '8px',
        sm: '16px',
        md: '24px',
        lg: '32px',
        xl: '48px',
      },
      boxShadow: {
        sm: '0 1px 2px rgba(0,0,0,0.08)',
        DEFAULT: '0 2px 6px rgba(0,0,0,0.12)',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}

export default config
PASSO 5: Configurar Global CSS
Criar arquivo apps/web/app/globals.css:
css@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&display=swap');
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    /* Cores do Design System */
    --primary-dark: 0 44 78;
    --accent-yellow: 255 243 115;
    --accent-cyan: 39 223 255;
    
    /* Aplicar ao Tailwind */
    --background: 255 255 255;
    --foreground: 32 32 32;
    --primary: 0 44 78;
    --primary-foreground: 255 255 255;
    --secondary: 244 244 245;
    --secondary-foreground: 32 32 32;
    --muted: 244 244 245;
    --muted-foreground: 113 113 122;
    --accent: 255 243 115;
    --accent-foreground: 0 44 78;
    --destructive: 179 38 30;
    --destructive-foreground: 255 255 255;
    --border: 212 212 216;
    --input: 212 212 216;
    --ring: 39 223 255;
    --radius: 12px;
  }

  * {
    @apply border-border;
  }
  
  body {
    @apply bg-background text-foreground;
    font-family: 'Montserrat', system-ui, sans-serif;
  }

  /* Mobile First - Base styles */
  h1 {
    @apply text-heading-1 text-accent;
  }
  
  h2 {
    @apply text-heading-2 text-white;
  }
  
  p {
    @apply text-body;
  }

  /* Scrollbar customization */
  ::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }
  
  ::-webkit-scrollbar-track {
    @apply bg-gray-50;
  }
  
  ::-webkit-scrollbar-thumb {
    @apply bg-gray-400 rounded-sm;
  }
  
  ::-webkit-scrollbar-thumb:hover {
    @apply bg-gray-600;
  }
}

@layer components {
  /* Container mobile-first */
  .container-app {
    @apply w-full px-4 mx-auto;
    @apply sm:max-w-[640px] sm:px-6;
    @apply md:max-w-[768px];
    @apply lg:max-w-[1024px] lg:px-8;
    @apply xl:max-w-[1280px];
  }

  /* Grid responsivo */
  .grid-responsive {
    @apply grid grid-cols-1;
    @apply sm:grid-cols-2;
    @apply lg:grid-cols-3;
    @apply gap-4 md:gap-6;
  }

  /* Card padrão */
  .card {
    @apply bg-white rounded-lg p-4 shadow-sm;
    @apply hover:shadow transition-shadow;
  }

  /* Botões do Design System */
  .btn-primary {
    @apply bg-accent text-primary font-semibold;
    @apply px-6 py-3 rounded-lg;
    @apply hover:opacity-90 transition-opacity;
    @apply disabled:opacity-40 disabled:cursor-not-allowed;
    @apply text-sm md:text-base;
  }
  
  .btn-secondary {
    @apply bg-transparent border-2 border-accent text-accent;
    @apply px-6 py-3 rounded-lg font-semibold;
    @apply hover:bg-accent hover:text-primary transition-all;
    @apply disabled:opacity-40 disabled:cursor-not-allowed;
    @apply text-sm md:text-base;
  }
  
  .btn-danger {
    @apply bg-destructive text-destructive-foreground;
    @apply px-6 py-3 rounded-lg font-semibold;
    @apply hover:opacity-90 transition-opacity;
    @apply disabled:opacity-40 disabled:cursor-not-allowed;
    @apply text-sm md:text-base;
  }

  /* Input padrão */
  .input-default {
    @apply w-full px-3 py-2 md:px-4 md:py-3;
    @apply border border-input rounded-lg;
    @apply focus:outline-none focus:ring-2 focus:ring-ring;
    @apply placeholder:text-muted-foreground;
    @apply text-sm md:text-base;
  }

  /* Mobile tab bar */
  .mobile-tab-bar {
    @apply fixed bottom-0 left-0 right-0;
    @apply bg-white border-t border-border;
    @apply flex justify-around items-center;
    @apply h-16 px-2;
    @apply md:hidden;
    @apply z-50;
  }

  .mobile-tab-item {
    @apply flex flex-col items-center justify-center;
    @apply text-xs text-gray-600;
    @apply p-2 rounded-lg;
    @apply hover:bg-secondary transition-colors;
  }

  .mobile-tab-item.active {
    @apply text-primary;
  }
}
PASSO 6: Criar Componentes Base (shadcn/ui style)
Criar arquivo apps/web/lib/utils.ts:
typescriptimport { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value)
}

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat('pt-BR').format(new Date(date))
}

export function formatTime(date: Date | string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(date))
}
Criar arquivo apps/web/components/ui/button.tsx:
typescriptimport * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-accent text-primary hover:opacity-90',
        secondary: 'bg-transparent border-2 border-accent text-accent hover:bg-accent hover:text-primary',
        destructive: 'bg-destructive text-destructive-foreground hover:opacity-90',
        outline: 'border border-input bg-background hover:bg-secondary',
        ghost: 'hover:bg-secondary hover:text-secondary-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-6 py-3',
        sm: 'h-8 px-4 text-xs',
        lg: 'h-12 px-8',
        icon: 'h-10 w-10',
      },
      fullWidth: {
        true: 'w-full',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, fullWidth, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, fullWidth, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }
PASSO 7: Configurar API Backend
bash# 7.1 - Configurar backend
cd ../../apps/api
npm init -y
npm install express cors helmet morgan compression dotenv
npm install jsonwebtoken bcryptjs
npm install @prisma/client prisma
npm install zod
npm install -D @types/express @types/cors @types/node @types/jsonwebtoken @types/bcryptjs
npm install -D typescript tsx nodemon
Criar arquivo apps/api/package.json:
json{
  "name": "@meu-personal/api",
  "version": "1.0.0",
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js",
    "prisma:generate": "prisma generate",
    "prisma:push": "prisma db push",
    "prisma:studio": "prisma studio"
  },
  "dependencies": {
    "express": "^4.19.0",
    "cors": "^2.8.5",
    "helmet": "^7.1.0",
    "morgan": "^1.10.0",
    "compression": "^1.7.4",
    "dotenv": "^16.4.0",
    "jsonwebtoken": "^9.0.2",
    "bcryptjs": "^2.4.3",
    "@prisma/client": "^5.15.0",
    "zod": "^3.23.0"
  }
}
PASSO 8: Configurar Banco de Dados (Prisma)
bashcd apps/api
npx prisma init
Criar arquivo apps/api/prisma/schema.prisma:
prismagenerator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum Role {
  STUDENT
  TEACHER
  ADMIN
  FRANCHISOR
}

enum BookingStatus {
  PENDING
  CONFIRMED
  COMPLETED
  CANCELLED
}

enum TransactionType {
  CREDIT_PURCHASE
  BOOKING_PAYMENT
  BOOKING_REFUND
}

model User {
  id            String    @id @default(cuid())
  email         String    @unique
  password      String
  name          String
  phone         String?
  role          Role      @default(STUDENT)
  credits       Int       @default(0)
  isActive      Boolean   @default(true)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  
  teacherProfile TeacherProfile?
  studentBookings Booking[] @relation("StudentBookings")
  teacherBookings Booking[] @relation("TeacherBookings")
  transactions    Transaction[]
  reviews         Review[]
}

model TeacherProfile {
  id            String    @id @default(cuid())
  userId        String    @unique
  bio           String?
  specialties   String[]
  hourlyRate    Decimal   @db.Decimal(10, 2)
  rating        Decimal?  @db.Decimal(3, 2)
  totalReviews  Int       @default(0)
  availability  Json      // Armazenar disponibilidade como JSON
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  
  user          User      @relation(fields: [userId], references: [id])
}

model Booking {
  id            String        @id @default(cuid())
  studentId     String
  teacherId     String
  date          DateTime
  duration      Int           @default(60) // em minutos
  status        BookingStatus @default(PENDING)
  checkInCode   String?       @unique
  checkedInAt   DateTime?
  notes         String?
  creditsCost   Int
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt
  
  student       User          @relation("StudentBookings", fields: [studentId], references: [id])
  teacher       User          @relation("TeacherBookings", fields: [teacherId], references: [id])
  review        Review?
  
  @@index([date, status])
  @@index([studentId])
  @@index([teacherId])
}

model Review {
  id            String    @id @default(cuid())
  bookingId     String    @unique
  studentId     String
  rating        Int       // 1-5
  comment       String?
  isVisible     Boolean   @default(false) // Fica visível após 7 dias
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  
  booking       Booking   @relation(fields: [bookingId], references: [id])
  student       User      @relation(fields: [studentId], references: [id])
}

model Transaction {
  id            String          @id @default(cuid())
  userId        String
  type          TransactionType
  amount        Int             // em créditos
  description   String
  referenceId   String?         // ID do pagamento Asaas
  createdAt     DateTime        @default(now())
  
  user          User            @relation(fields: [userId], references: [id])
  
  @@index([userId, createdAt])
}

model CreditPackage {
  id            String    @id @default(cuid())
  name          String
  credits       Int
  price         Decimal   @db.Decimal(10, 2)
  isActive      Boolean   @default(true)
  forRole       Role
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}

model Setting {
  id            String    @id @default(cuid())
  key           String    @unique
  value         Json
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}
PASSO 9: Criar Estrutura da API
bashcd apps/api
mkdir -p src/{controllers,routes,services,middlewares,utils,types}
Criar arquivo apps/api/src/server.ts:
typescriptimport express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import compression from 'compression'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001

// Middlewares
app.use(helmet())
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}))
app.use(compression())
app.use(morgan('dev'))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Routes (serão adicionadas)
// app.use('/api/auth', authRoutes)
// app.use('/api/users', userRoutes)
// app.use('/api/bookings', bookingRoutes)
// app.use('/api/credits', creditRoutes)

// Error handling
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack)
  res.status(err.status || 500).json({
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  })
})

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`)
})
PASSO 10: Configurar Variáveis de Ambiente
Criar arquivo .env.example na raiz:
env# Database
DATABASE_URL="postgresql://user:password@localhost:5432/meu_personal?schema=public"

# API
PORT=3001
FRONTEND_URL=http://localhost:3000

# Auth
JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRES_IN=7d

# Asaas
ASAAS_API_KEY=your_asaas_api_key
ASAAS_API_URL=https://www.asaas.com/api/v3

# Redis (para cache)
REDIS_URL=redis://localhost:6379

# Email (futuro)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
PASSO 11: Criar Docker Compose para Desenvolvimento
Criar arquivo docker-compose.yml na raiz:
yamlversion: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: meu-personal-db
    environment:
      POSTGRES_DB: meu_personal
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres123
    ports:
      - '5432:5432'
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    container_name: meu-personal-redis
    ports:
      - '6379:6379'
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
PASSO 12: Criar Scripts de Setup
Criar arquivo setup.sh na raiz:
bash#!/bin/bash

echo "🚀 Iniciando setup do projeto Meu Personal..."

# Install dependencies
echo "📦 Instalando dependências..."
npm install

# Start Docker containers
echo "🐳 Iniciando containers Docker..."
docker-compose up -d

# Wait for database
echo "⏳ Aguardando banco de dados..."
sleep 5

# Run Prisma migrations
echo "🗄️ Configurando banco de dados..."
cd apps/api
npx prisma generate
npx prisma db push
cd ../..

# Create .env files
echo "📝 Criando arquivos .env..."
cp .env.example .env
cp .env.example apps/api/.env
cp .env.example apps/web/.env.local

echo "✅ Setup concluído! Execute 'npm run dev' para iniciar o projeto."
PASSO 13: Criar Layout Base Mobile-First
Criar arquivo apps/web/components/layout/mobile-nav.tsx:
typescript'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Search, Calendar, User } from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/inicio', label: 'Início', icon: Home },
  { href: '/buscar', label: 'Buscar', icon: Search },
  { href: '/aulas', label: 'Aulas', icon: Calendar },
  { href: '/perfil', label: 'Perfil', icon: User },
]

export function MobileNav() {
  const pathname = usePathname()

  return (
    <nav className="mobile-tab-bar">
      {navItems.map((item) => {
        const Icon = item.icon
        const isActive = pathname === item.href
        
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'mobile-tab-item',
              isActive && 'active'
            )}
          >
            <Icon className="h-5 w-5 mb-1" />
            <span>{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
PASSO 14: Criar Provider Principal
Criar arquivo apps/web/components/providers.tsx:
typescript'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { Toaster } from 'sonner'
import { useState } from 'react'

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            refetchOnWindowFocus: false,
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster 
        position="top-center"
        toastOptions={{
          style: {
            background: 'white',
            color: '#202020',
            border: '1px solid #D4D4D8',
          },
        }}
      />
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  )
}
PASSO 15: Comandos Finais de Execução
bash# 15.1 - Tornar script executável e rodar setup
chmod +x setup.sh
./setup.sh

# 15.2 - Adicionar scripts no package.json raiz
npm pkg set scripts.dev="npm run dev --workspace=web & npm run dev --workspace=api"
npm pkg set scripts.build="npm run build --workspaces"
npm pkg set scripts.start="npm run start --workspaces"
npm pkg set scripts.db:push="npm run prisma:push --workspace=api"
npm pkg set scripts.db:studio="npm run prisma:studio --workspace=api"

# 15.3 - Iniciar desenvolvimento
npm run dev
📋 CHECKLIST DE VALIDAÇÃO
Após executar todos os passos, verifique:

 O projeto inicia em http://localhost:3000 (frontend)
 A API responde em http://localhost:3001/health
 O banco PostgreSQL está rodando na porta 5432
 Redis está rodando na porta 6379
 Tailwind está aplicando as cores corretas do design system
 A fonte Montserrat está carregando corretamente
 Layout mobile-first está funcionando
 Componentes UI estão com as cores #002C4E e #FFF373
 Prisma Studio abre com npm run db:studio

🎯 RESULTADO ESPERADO
Ao final, você terá:

✅ Monorepo configurado com workspaces npm
✅ Next.js 15 com App Router configurado
✅ API Express com TypeScript
✅ Banco PostgreSQL com Prisma
✅ Design System implementado com as cores exatas
✅ Layout mobile-first responsivo
✅ Componentes base prontos
✅ Autenticação JWT preparada
✅ Docker para desenvolvimento local
✅ Estrutura escalável e pronta para crescer


IMPORTANTE: Execute cada passo na ordem apresentada. Se encontrar algum erro, verifique as dependências e versões. O projeto está configurado para ser mobile-first com as cores exatas do branding (#002C4E, #FFF373, #27DFFF).