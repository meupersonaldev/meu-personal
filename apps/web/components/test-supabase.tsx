'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'

export default function TestSupabase() {
  const [status, setStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')

  const testConnection = async () => {
    setStatus('testing')
    setMessage('Testando conexão...')

    try {
      // Teste 1: Verificar conexão básica
      const { data, error } = await supabase
        .from('users')
        .select('count')
        .limit(1)

      if (error) {
        throw error
      }

      // Teste 2: Verificar auth
      const { data: session } = await supabase.auth.getSession()
      
      setStatus('success')
      setMessage(`✅ Conexão OK! Usuários na base: ${data?.length || 0}. Auth: ${session.session ? 'Logado' : 'Não logado'}`)
      
    } catch (error: any) {
      setStatus('error')
      setMessage(`❌ Erro: ${error.message}`)
      console.error('Supabase test error:', error)
    }
  }

  const testAuth = async () => {
    setStatus('testing')
    setMessage('Testando dados da tabela users...')

    try {
      // Testar busca na tabela users diretamente
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', 'joao@email.com')
        .single()

      if (error) {
        throw error
      }

      setStatus('success')
      setMessage(`✅ Dados OK! Usuário: ${data.name} (${data.role}) - ${data.credits} créditos`)
      
    } catch (error: any) {
      setStatus('error')
      setMessage(`❌ Erro: ${error.message}`)
      console.error('Data test error:', error)
    }
  }

  const testRealAuth = async () => {
    setStatus('testing')
    setMessage('Testando login real no Supabase Auth...')

    try {
      // Tentar login com Supabase Auth
      const { data, error } = await supabase.auth.signInWithPassword({
        email: 'joao@email.com',
        password: '123456'
      })

      if (error) {
        throw error
      }

      setStatus('success')
      setMessage(`✅ Login Real OK! Usuário: ${data.user?.email} - ID: ${data.user?.id}`)
      
    } catch (error: any) {
      setStatus('error')
      setMessage(`❌ Login Real Error: ${error.message}`)
      console.error('Real auth test error:', error)
    }
  }

  return (
    <div className="p-6 bg-white rounded-lg shadow-sm border">
      <h3 className="text-lg font-semibold mb-4">🧪 Teste Supabase</h3>
      
      <div className="space-y-4">
        <div className="flex gap-2">
          <Button 
            onClick={testConnection}
            disabled={status === 'testing'}
            variant="outline"
          >
            {status === 'testing' ? 'Testando...' : 'Testar Conexão'}
          </Button>
          
          <Button 
            onClick={testAuth}
            disabled={status === 'testing'}
            variant="outline"
          >
            {status === 'testing' ? 'Testando...' : 'Testar Dados'}
          </Button>
          
          <Button 
            onClick={testRealAuth}
            disabled={status === 'testing'}
            variant="outline"
          >
            {status === 'testing' ? 'Testando...' : 'Testar Login Real'}
          </Button>
        </div>

        {message && (
          <div className={`p-3 rounded-lg ${
            status === 'success' ? 'bg-green-50 text-green-800' :
            status === 'error' ? 'bg-red-50 text-red-800' :
            'bg-blue-50 text-blue-800'
          }`}>
            {message}
          </div>
        )}

        <div className="text-sm text-gray-600">
          <p><strong>URL:</strong> {process.env.NEXT_PUBLIC_SUPABASE_URL}</p>
          <p><strong>Key:</strong> {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ Configurada' : '❌ Não configurada'}</p>
        </div>
      </div>
    </div>
  )
}
