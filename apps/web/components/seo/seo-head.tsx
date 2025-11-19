import Head from 'next/head'
import { StructuredData } from './structured-data'

interface SEOHeadProps {
  title?: string
  description?: string
  keywords?: string[]
  canonicalUrl?: string
  ogImage?: string
  ogType?: 'website' | 'article' | 'profile'
  noIndex?: boolean
  structuredData?: {
    type?: 'webpage' | 'service' | 'localBusiness'
    data?: any
  }
}

export function SEOHead({
  title,
  description,
  keywords = [],
  canonicalUrl,
  ogImage,
  ogType = 'website',
  noIndex = false,
  structuredData: seoStructuredData
}: SEOHeadProps) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://meupersonal.com.br'
  const fullTitle = title ? `${title} | Meu Personal` : 'Meu Personal - Plataforma de Personal Training'
  const fullCanonicalUrl = canonicalUrl ? `${baseUrl}${canonicalUrl}` : baseUrl

  const defaultDescription = 'Conectando professores e alunos para aulas personalizadas em academias franqueadas. Encontre o personal trainer ideal para seus objetivos de fitness e saúde.'
  const metaDescription = description || defaultDescription

  const defaultKeywords = [
    'personal training',
    'personal trainer',
    'academia',
    'fitness',
    'saúde',
    'exercícios',
    'treinamento pessoal',
    'aulas particulares',
    'professores de educação física',
    'franquia de academia'
  ]

  const metaKeywords = [...defaultKeywords, ...keywords].join(', ')

  const metaImage = ogImage || `${baseUrl}/images/og-image.png`

  return (
    <>
      <Head>
        {/* Basic Meta Tags */}
        <title>{fullTitle}</title>
        <meta name="description" content={metaDescription} />
        <meta name="keywords" content={metaKeywords} />
        <meta name="author" content="Meu Personal" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#002C4E" />
        <meta name="msapplication-TileColor" content="#002C4E" />

        {/* Canonical URL */}
        <link rel="canonical" href={fullCanonicalUrl} />

        {/* Robots */}
        {noIndex ? (
          <meta name="robots" content="noindex, nofollow" />
        ) : (
          <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
        )}

        {/* Open Graph */}
        <meta property="og:type" content={ogType} />
        <meta property="og:title" content={fullTitle} />
        <meta property="og:description" content={metaDescription} />
        <meta property="og:url" content={fullCanonicalUrl} />
        <meta property="og:image" content={metaImage} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:alt" content={fullTitle} />
        <meta property="og:site_name" content="Meu Personal" />
        <meta property="og:locale" content="pt_BR" />

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={fullTitle} />
        <meta name="twitter:description" content={metaDescription} />
        <meta name="twitter:image" content={metaImage} />
        <meta name="twitter:site" content="@meupersonal" />
        <meta name="twitter:creator" content="@meupersonal" />

        {/* Additional Meta Tags */}
        <meta name="language" content="pt-BR" />
        <meta name="geo.region" content="BR" />
        <meta name="geo.country" content="Brazil" />
        <meta name="ICBM" content="-23.5505;-46.6333" />

        {/* Favicon */}
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="icon" href="/favicon.ico" sizes="32x32" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/site.webmanifest" />
        <link rel="mask-icon" href="/safari-pinned-tab.svg" color="#002C4E" />

        {/* Preconnect to external domains */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </Head>

      {/* Structured Data */}
      {seoStructuredData && (
        <StructuredData
          type={seoStructuredData.type}
          data={seoStructuredData.data}
        />
      )}
    </>
  )
}