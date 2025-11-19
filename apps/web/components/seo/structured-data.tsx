import { Organization, WebSite, WebPage, Service, LocalBusiness } from 'schema-dts'

interface StructuredDataProps {
  type?: 'organization' | 'website' | 'webpage' | 'service' | 'localBusiness'
  data?: any
  customJsonLd?: Record<string, any>
}

export function StructuredData({ type, data, customJsonLd }: StructuredDataProps) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://meupersonal.com.br'

  const getStructuredData = (): Record<string, any> => {
    switch (type) {
      case 'organization':
        return {
          '@context': 'https://schema.org',
          '@type': 'Organization',
          name: 'Meu Personal',
          alternateName: 'Meu Personal - Plataforma de Personal Training',
          description: 'Conectando professores e alunos para aulas personalizadas em academias franqueadas',
          url: baseUrl,
          logo: `${baseUrl}/images/logo-full.png`,
          contactPoint: {
            '@type': 'ContactPoint',
            telephone: '+55-11-9999-9999',
            contactType: 'customer service',
            availableLanguage: ['Portuguese']
          },
          sameAs: [
            'https://www.instagram.com/meupersonal',
            'https://www.facebook.com/meupersonal',
            'https://www.linkedin.com/company/meupersonal'
          ],
          foundingDate: '2024',
          address: {
            '@type': 'PostalAddress',
            addressCountry: 'BR',
            addressRegion: 'SP'
          },
          areaServed: ['BR'],
          knowsAbout: ['Personal Training', 'Fitness', 'Educação Física', 'Saúde e Bem-estar']
        } as Organization

      case 'website':
        return {
          '@context': 'https://schema.org',
          '@type': 'WebSite',
          name: 'Meu Personal',
          alternateName: 'Meu Personal - Plataforma de Personal Training',
          description: 'Conectando professores e alunos para aulas personalizadas em academias franqueadas',
          url: baseUrl,
          potentialAction: {
            '@type': 'SearchAction',
            target: {
              '@type': 'EntryPoint',
              urlTemplate: `${baseUrl}/professores?q={search_term_string}`
            },
            'query-input': 'required name=search_term_string'
          },
          publisher: {
            '@type': 'Organization',
            name: 'Meu Personal',
            url: baseUrl
          }
        } as WebSite

      case 'webpage':
        return {
          '@context': 'https://schema.org',
          '@type': 'WebPage',
          name: data?.title || 'Meu Personal - Plataforma de Personal Training',
          description: data?.description || 'Conectando professores e alunos para aulas personalizadas em academias franqueadas',
          url: data?.url || baseUrl,
          isPartOf: {
            '@type': 'WebSite',
            name: 'Meu Personal',
            url: baseUrl
          },
          about: {
            '@type': 'Thing',
            name: 'Personal Training e Fitness'
          },
          audience: {
            '@type': 'Audience',
            audienceType: ['Professores de Educação Física', 'Alunos de Academia', 'Entusiastas de Fitness']
          },
          mainEntity: data?.mainEntity
        } as WebPage

      case 'service':
        return {
          '@context': 'https://schema.org',
          '@type': 'Service',
          name: 'Aulas de Personal Training',
          description: 'Aulas particulares com professores de educação física qualificados em academias equipadas',
          provider: {
            '@type': 'Organization',
            name: 'Meu Personal',
            url: baseUrl
          },
          serviceType: 'Personal Training',
          areaServed: {
            '@type': 'Country',
            name: 'Brasil'
          },
          hasOfferCatalog: {
            '@type': 'OfferCatalog',
            name: 'Planos de Treinamento',
            itemListElement: [
              {
                '@type': 'Offer',
                itemOffered: {
                  '@type': 'Service',
                  name: 'Aula Particular Individual'
                }
              },
              {
                '@type': 'Offer',
                itemOffered: {
                  '@type': 'Service',
                  name: 'Aula em Dupla'
                }
              },
              {
                '@type': 'Offer',
                itemOffered: {
                  '@type': 'Service',
                  name: 'Pacote de Aulas'
                }
              }
            ]
          }
        } as Service

      case 'localBusiness':
        return {
          '@context': 'https://schema.org',
          '@type': 'LocalBusiness',
          name: 'Meu Personal',
          description: 'Plataforma de personal training conectando professores e alunos',
          url: baseUrl,
          telephone: '+55-11-9999-9999',
          address: {
            '@type': 'PostalAddress',
            addressCountry: 'BR',
            addressRegion: 'SP'
          },
          geo: {
            '@type': 'GeoCoordinates',
            latitude: '-23.5505',
            longitude: '-46.6333'
          },
          openingHours: 'Mo-Su 00:00-23:59',
          priceRange: '$$',
          paymentAccepted: ['Cash', 'Credit Card', 'Debit Card', 'PIX'],
          currenciesAccepted: 'BRL'
        } as LocalBusiness

      default:
        return customJsonLd || {}
    }
  }

  const structuredData = getStructuredData()

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(structuredData, null, 2)
      }}
    />
  )
}