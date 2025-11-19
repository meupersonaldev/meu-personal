export default function TestFavicon() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
      <div className="max-w-4xl w-full bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">
          🎨 Teste de Favicon
        </h1>

        <div className="space-y-6">
          <div className="p-4 bg-blue-50 rounded-lg">
            <h2 className="text-xl font-semibold text-blue-900 mb-2">
              ✅ Favicon atualizado com branding Meu Personal:
            </h2>
            <ul className="list-disc list-inside text-blue-800 space-y-1">
              <li>Cor primária: #002C4E (azul escuro)</li>
              <li>Cor de destaque: #FFF373 (amarelo)</li>
              <li>Logo "MP" estilizado</li>
              <li>Ponto decorativo em #27DFFF (azul claro)</li>
            </ul>
          </div>

          <div className="p-4 bg-green-50 rounded-lg">
            <h2 className="text-xl font-semibold text-green-900 mb-2">
              📁 Arquivos de favicon criados:
            </h2>
            <ul className="list-disc list-inside text-green-800 space-y-1">
              <li><code>apps/web/app/favicon.svg</code> - Para browsers modernos</li>
              <li><code>apps/web/app/favicon.png</code> - Compatibilidade máxima</li>
              <li><code>apps/web/public/favicon-32.png</code> - Backup</li>
              <li><code>apps/web/public/favicon-192x192.png</code> - Apple Touch</li>
            </ul>
          </div>

          <div className="p-4 bg-purple-50 rounded-lg">
            <h2 className="text-xl font-semibold text-purple-900 mb-2">
              🧪 Como verificar:
            </h2>
            <ol className="list-decimal list-inside text-purple-800 space-y-2">
              <li>Olhe na aba do navegador - deve mostrar nosso logo</li>
              <li>Verifique o bookmark/favorito</li>
              <li>Teste em diferentes browsers</li>
              <li>Verifique no mobile (iPhone/Android)</li>
            </ol>
          </div>

          <div className="p-4 bg-yellow-50 rounded-lg">
            <h2 className="text-xl font-semibold text-yellow-900 mb-2">
              🔧 Se ainda não aparecer:
            </h2>
            <ul className="list-disc list-inside text-yellow-800 space-y-1">
              <li>Limpe o cache do navegador (Ctrl+F5)</li>
              <li>Feche e abra a aba novamente</li>
              <li>Reinicie o navegador</li>
              <li>Tente em navegador anônimo</li>
            </ul>
          </div>

          <div className="p-4 bg-gray-100 rounded-lg">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              🖼️ Visualização do favicon:
            </h2>
            <div className="flex items-center gap-4">
              <img
                src="/favicon.svg"
                alt="Favicon SVG"
                className="w-8 h-8 border border-gray-300"
              />
              <span className="text-sm text-gray-600">Versão SVG</span>
            </div>
            <div className="flex items-center gap-4 mt-2">
              <img
                src="/favicon.png"
                alt="Favicon PNG"
                className="w-8 h-8 border border-gray-300"
              />
              <span className="text-sm text-gray-600">Versão PNG</span>
            </div>
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
  )
}