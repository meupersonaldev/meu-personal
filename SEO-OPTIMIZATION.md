# SEO Optimization Guide - Meu Personal

Este documento descreve as otimizações de SEO implementadas na aplicação Meu Personal.

## 🚀 O que foi implementado:

### 1. Metadados Otimizados
- **Títulos dinâmicos** com template `%s | Meu Personal`
- **Descrições detalhadas** com palavras-chave relevantes
- **Keywords estratégicas** para o nicho de fitness e personal training
- **Open Graph tags** para redes sociais
- **Twitter Card** otimizado
- **Canonical URLs** para evitar conteúdo duplicado

### 2. Favicons e Ícones
- **SVG favicon** responsivo e moderno
- **Apple Touch Icon** para iOS
- **Manifest PWA** para instalação como aplicativo
- **Safari Pinned Tab** para macOS
- **Multiple sizes** para diferentes contextos

### 3. Imagens para Social Preview
- **Open Graph images** (1200x630px)
- **Square images** (1200x1200px) para alguns platforms
- **SVG otimizados** com gradientes e branding
- **Alt text descritivo** para acessibilidade

### 4. Structured Data (JSON-LD)
- **Organization schema** com informações da empresa
- **Website schema** com search action
- **Service schema** para os serviços oferecidos
- **LocalBusiness schema** para informações locais
- **WebPage schema** para conteúdo específico

### 5. Arquivos SEO
- **robots.txt** configurado para permitir crawlers importantes
- **sitemap.xml** dinâmico com prioridades
- **PWA manifest** para melhor experiência mobile

### 6. Componentes Reutilizáveis
- **SEOHead component** para páginas específicas
- **StructuredData component** para schema markup
- **useSEO hook** para otimização dinâmica

## 📊 Como usar:

### Para páginas específicas:
```tsx
import { SEOHead } from '@/components/seo/seo-head'

export default function AboutPage() {
  return (
    <>
      <SEOHead
        title="Sobre Nós"
        description="Conheça a história do Meu Personal e nossa missão de conectar professores e alunos"
        keywords=["sobre nós", "missão", "visão", "valores"]}
        ogImage="/images/og-about.png"
      />
      {/* Page content */}
    </>
  )
}
```

### Para SEO dinâmico:
```tsx
import { useSEO } from '@/hooks/use-seo'

export default function TeacherPage({ teacher }: TeacherPageProps) {
  useSEO({
    title: teacher.name,
    description: `Agende aulas com ${teacher.name}, professor especializado em ${teacher.specialization}`,
    keywords: [teacher.specialization, teacher.name, "personal trainer"]
  })

  return <div>{/* Page content */}</div>
}
```

### Para structured data personalizado:
```tsx
<StructuredData
  type="webpage"
  data={{
    mainEntity: {
      '@type': 'Person',
      name: teacher.name,
      jobTitle: 'Personal Trainer',
      description: teacher.bio
    }
  }}
/>
```

## 🔧 Configurações de Ambiente:

Adicione ao seu `.env.local`:
```env
NEXT_PUBLIC_SITE_URL=https://seu-dominio.com.br
GOOGLE_SITE_VERIFICATION=sua-verificacao-google
YANDEX_VERIFICATION=sua-verificacao-yandex
YAHOO_SITE_VERIFICATION=sua-verificacao-yahoo
```

## 📈 Benefícios Esperados:

1. **Melhor ranking** em buscadores
2. **Preview rico** em redes sociais
3. **Experiência mobile** otimizada
4. **Carregamento rápido** com recursos otimizados
5. **Acessibilidade** melhorada
6. **Instalação como PWA** possível

## 🛠️ Manutenção:

- **Atualizar sitemap** quando novas páginas forem adicionadas
- **Revisar keywords** periodicamente
- **Monitorar performance** com Google Search Console
- **Testar social preview** com Facebook Debugger
- **Validar structured data** com Rich Results Test

## 📱 PWA Features:

- **Offline capability** (quando implementado)
- **Add to Home Screen** prompt
- **Splash screen** customizada
- **Status bar** com tema da marca

## 🔍 Ferramentas de Teste:

- [Google PageSpeed Insights](https://pagespeed.web.dev/)
- [GTmetrix](https://gtmetrix.com/)
- [Facebook Debugger](https://developers.facebook.com/tools/debug/)
- [Twitter Card Validator](https://cards-dev.twitter.com/validator)
- [Rich Results Test](https://search.google.com/test/rich-results)
- [Schema Markup Validator](https://validator.schema.org/)

## 📝 Notas:

- Todas as imagens OG estão em formato SVG para melhor qualidade
- Os favicons utilizam o esquema de cores da marca
- O structured data segue as diretrizes do Schema.org
- O sitemap é atualizado dinamicamente com Next.js
- O robots.txt permite crawlers importantes mas bloqueia áreas admin

---

## 🎯 Próximos Passos Sugeridos:

1. Implementar **Blog** para content marketing
2. Adicionar **FAQ schema** para perguntas frequentes
3. Criar **Review/Rating schema** para avaliações
4. Implementar **BreadcrumbList schema**
5. Adicionar **Event schema** para aulas e eventos
6. Criar **Video schema** para tutoriais
7. Implementar **AMP pages** para artigos
8. Adicionar **internacionalização** hreflang tags