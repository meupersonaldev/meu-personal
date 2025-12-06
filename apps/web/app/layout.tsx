import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";
import { StructuredData } from "@/components/seo/structured-data";

export const metadata: Metadata = {
  title: {
    default: "Meu Personal - Plataforma de Personal Training",
    template: "%s | Meu Personal"
  },
  description: "Conectando professores e alunos para aulas personalizadas em academias franqueadas. Encontre o personal trainer ideal para seus objetivos de fitness e saúde.",
  keywords: [
    "personal training",
    "personal trainer",
    "academia",
    "fitness",
    "saúde",
    "exercícios",
    "treinamento pessoal",
    "aulas particulares",
    "professores de educação física",
    "franquia de academia"
  ],
  authors: [{ name: "Meu Personal" }],
  creator: "Meu Personal",
  publisher: "Meu Personal",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://meupersonal.com.br'),
  alternates: {
    canonical: '/',
    languages: {
      'pt-BR': '/pt-BR',
    },
  },
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    url: '/',
    title: 'Meu Personal - Plataforma de Personal Training',
    description: 'Conectando professores e alunos para aulas personalizadas em academias franqueadas. Encontre o personal trainer ideal para seus objetivos de fitness e saúde.',
    siteName: 'Meu Personal',
    images: [
      {
        url: '/images/og-image-v2.png',
        width: 1200,
        height: 630,
        alt: 'Meu Personal - Plataforma de Personal Training',
      }
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Meu Personal - Plataforma de Personal Training',
    description: 'Conectando professores e alunos para aulas personalizadas em academias franqueadas.',
    images: ['/images/og-image-v2.png'],
    creator: '@meupersonal',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION,
    yandex: process.env.YANDEX_VERIFICATION,
    yahoo: process.env.YAHOO_SITE_VERIFICATION,
  },
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon.ico', sizes: 'any' }
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
      { url: '/favicon-192x192.png', sizes: '192x192', type: 'image/png' }
    ],
    shortcut: '/favicon.ico',
    other: [
      { rel: 'mask-icon', url: '/safari-pinned-tab.svg', color: '#002C4E' }
    ],
  },
  manifest: '/site.webmanifest',
  other: {
    'msapplication-TileColor': '#002C4E',
    'theme-color': '#002C4E',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        <StructuredData type="organization" />
        <StructuredData type="website" />
        <StructuredData type="service" />

        {/* Explicit favicon links for better browser compatibility */}
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="icon" href="/favicon.png" type="image/png" />
        <link rel="apple-touch-icon" href="/favicon-192x192.png" sizes="192x192" />
        <link rel="manifest" href="/site.webmanifest" />
        <meta name="theme-color" content="#002C4E" />
      </head>
      <body className="antialiased">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
