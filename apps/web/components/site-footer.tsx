import Link from 'next/link'

export default function SiteFooter() {
  return (
    <footer className="py-12 lg:py-16 bg-meu-primary-dark border-t border-meu-accent/20">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 mb-8 lg:mb-12">
          <div>
            <h4 className="font-semibold mb-4 lg:mb-6 text-white text-lg">Para Alunos</h4>
            <ul className="space-y-3 text-gray-300">
              <li><Link href="/aluno/cadastro" className="hover:text-meu-accent transition-colors">Cadastrar</Link></li>
              <li><Link href="/aluno/login" className="hover:text-meu-accent transition-colors">Login</Link></li>
              <li><Link href="#para-alunos" className="hover:text-meu-accent transition-colors">Como Funciona</Link></li>
              <li><Link href="#" className="hover:text-meu-accent transition-colors">Encontrar Personal</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4 lg:mb-6 text-white text-lg">Para Professores</h4>
            <ul className="space-y-3 text-gray-300">
              <li><Link href="/professor/cadastro" className="hover:text-meu-cyan transition-colors">Cadastrar</Link></li>
              <li><Link href="/professor/login" className="hover:text-meu-cyan transition-colors">Login</Link></li>
              <li><Link href="#para-professores" className="hover:text-meu-cyan transition-colors">Benefícios</Link></li>
              <li><Link href="#" className="hover:text-meu-cyan transition-colors">Academias Parceiras</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4 lg:mb-6 text-white text-lg">Legal</h4>
            <ul className="space-y-3 text-gray-300">
              <li><Link href="/privacidade" className="hover:text-meu-accent transition-colors">Política de Privacidade</Link></li>
              <li><Link href="/termos" className="hover:text-meu-accent transition-colors">Termos de Uso</Link></li>
              <li><Link href="/cookies" className="hover:text-meu-accent transition-colors">Política de Cookies</Link></li>
              <li><Link href="/legal/lgpd" className="hover:text-meu-accent transition-colors">LGPD</Link></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-meu-accent/20 pt-6 lg:pt-8 text-center">
          <p className="text-gray-300">&copy; 2025 Meu Personal. Todos os direitos reservados.</p>
        </div>
      </div>
    </footer>
  )
}

