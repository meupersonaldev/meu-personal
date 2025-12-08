import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

export function useSEO(options?: {
  title?: string
  description?: string
  keywords?: string[]
  ogImage?: string
  noIndex?: boolean
}) {
  const pathname = usePathname()
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://meupersonal.com.br'

  useEffect(() => {
    if (!options) return

    const {
      title,
      description,
      keywords = [],
      ogImage,
      noIndex = false
    } = options

    // Update document title
    if (title) {
      document.title = `${title} | Meu Personal`
    }

    // Update or create meta description
    const updateMetaTag = (name: string, content: string) => {
      let meta = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement
      if (!meta) {
        meta = document.createElement('meta')
        meta.name = name
        document.head.appendChild(meta)
      }
      meta.content = content
    }

    // Update or create meta property
    const updateMetaProperty = (property: string, content: string) => {
      let meta = document.querySelector(`meta[property="${property}"]`) as HTMLMetaElement
      if (!meta) {
        meta = document.createElement('meta')
        meta.setAttribute('property', property)
        document.head.appendChild(meta)
      }
      meta.content = content
    }

    // Update description
    if (description) {
      updateMetaTag('description', description)
      updateMetaProperty('og:description', description)
      updateMetaTag('twitter:description', description)
    }

    // Update keywords
    if (keywords.length > 0) {
      const defaultKeywords = [
        'personal training',
        'personal trainer',
        'academia',
        'fitness',
        'saúde',
        'exercícios',
        'treinamento pessoal',
        'aulas particulares'
      ]
      const allKeywords = [...defaultKeywords, ...keywords].join(', ')
      updateMetaTag('keywords', allKeywords)
    }

    // Update Open Graph image
    if (ogImage) {
      updateMetaProperty('og:image', ogImage)
      updateMetaTag('twitter:image', ogImage)
    }

    // Update canonical URL
    const currentUrl = `${baseUrl}${pathname}`
    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement
    if (!canonical) {
      canonical = document.createElement('link')
      canonical.rel = 'canonical'
      document.head.appendChild(canonical)
    }
    canonical.href = currentUrl

    // Update robots meta
    const robotsContent = noIndex
      ? 'noindex, nofollow'
      : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1'
    updateMetaTag('robots', robotsContent)

    // Update other Open Graph tags
    if (title) {
      updateMetaProperty('og:title', `${title} | Meu Personal`)
      updateMetaTag('twitter:title', `${title} | Meu Personal`)
    }

    updateMetaProperty('og:url', currentUrl)
    updateMetaProperty('og:type', 'website')
    updateMetaProperty('og:site_name', 'Meu Personal')
    updateMetaProperty('og:locale', 'pt_BR')

  }, [options, pathname, baseUrl])

  // Function to generate structured data for specific pages
  const generateStructuredData = (type: string, data: any) => {
    const structuredData = {
      '@context': 'https://schema.org',
      '@type': type,
      ...data
    }

    // Remove existing structured data script
    const existingScript = document.querySelector('script[type="application/ld+json"]')
    if (existingScript) {
      existingScript.remove()
    }

    // Add new structured data
    const script = document.createElement('script')
    script.type = 'application/ld+json'
    script.textContent = JSON.stringify(structuredData, null, 2)
    document.head.appendChild(script)
  }

  return {
    updateSEO: (newOptions: typeof options) => {
      // Force re-render with new options
      Object.assign(options || {}, newOptions)
    },
    generateStructuredData
  }
}