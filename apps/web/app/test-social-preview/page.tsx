import { SEOHead } from '@/components/seo/seo-head'

export default function TestSocialPreview() {
  return (
    <>
      <SEOHead
        title="Teste Social Preview"
        description="Página de teste para verificar como os cards aparecem nas redes sociais"
        keywords={['teste', 'social preview', 'opengraph', 'twitter card']}
        ogImage="/images/og-image-v2.png"
      />

      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
        <div className="max-w-4xl w-full bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">
            🧪 Teste de Social Preview
          </h1>

          <div className="space-y-6">
            <div className="p-4 bg-blue-50 rounded-lg">
              <h2 className="text-xl font-semibold text-blue-900 mb-2">
                ✅ O que foi implementado:
              </h2>
              <ul className="list-disc list-inside text-blue-800 space-y-1">
                <li>Meta tags Open Graph otimizadas</li>
                <li>Twitter Cards configurados</li>
                <li>Imagens OG em alta resolução (1200x630px)</li>
                <li>Structured data para SEO</li>
                <li>Favicons modernos</li>
              </ul>
            </div>

            <div className="p-4 bg-green-50 rounded-lg">
              <h2 className="text-xl font-semibold text-green-900 mb-2">
                🎯 Como testar:
              </h2>
              <div className="space-y-3">
                <div>
                  <a
                    href="https://developers.facebook.com/tools/debug/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 underline"
                  >
                    🔗 Facebook Debugger - Clique aqui para testar
                  </a>
                  <p className="text-sm text-gray-600 mt-1">
                    Cole a URL desta página para ver como aparece no Facebook
                  </p>
                </div>

                <div>
                  <a
                    href="https://cards-dev.twitter.com/validator"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 underline"
                  >
                    🔗 Twitter Card Validator - Clique aqui para testar
                  </a>
                  <p className="text-sm text-gray-600 mt-1">
                    Cole a URL para ver como aparece no Twitter/X
                  </p>
                </div>

                <div>
                  <a
                    href="https://search.google.com/test/rich-results"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 underline"
                  >
                    🔗 Google Rich Results Test - Clique aqui para testar
                  </a>
                  <p className="text-sm text-gray-600 mt-1">
                    Teste structured data e search appearance
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 bg-purple-50 rounded-lg">
              <h2 className="text-xl font-semibold text-purple-900 mb-2">
                📱 Imagens disponíveis:
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <img
                    src="/images/og-image-v2.png"
                    alt="OG Image v2"
                    className="w-full rounded border border-gray-300"
                  />
                  <p className="text-sm text-gray-600 mt-1">og-image-v2.png (com foto)</p>
                </div>
                <div className="text-center">
                  <img
                    src="/images/og-image.png"
                    alt="OG Image"
                    className="w-full rounded border border-gray-300"
                  />
                  <p className="text-sm text-gray-600 mt-1">og-image.png (padrão)</p>
                </div>
                <div className="text-center">
                  <img
                    src="/images/og-image-square.png"
                    alt="OG Square"
                    className="w-full rounded border border-gray-300"
                  />
                  <p className="text-sm text-gray-600 mt-1">og-image-square.png (quadrada)</p>
                </div>
              </div>
            </div>

            <div className="p-4 bg-yellow-50 rounded-lg">
              <h2 className="text-xl font-semibold text-yellow-900 mb-2">
                🌐 URL para testar:
              </h2>
              <div className="bg-white p-3 rounded border border-gray-300">
                <code className="text-sm text-gray-700">
                  {typeof window !== 'undefined' ? window.location.origin : 'https://seu-dominio.com.br'}{window.location.pathname}
                </code>
              </div>
              <p className="text-sm text-gray-600 mt-2">
                Copie esta URL e cole nos ferramentas de teste acima
              </p>
            </div>

            <div className="text-center pt-6">
              <a
                href="/"
                className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors"
              >
                🏠 Voltar para Home
              </a>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}