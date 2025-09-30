'use client'

import { useState, useEffect } from 'react'
import { useAuthStore } from '@/lib/stores/auth-store'

export interface Aula {
  id: string
  data: string
  hora: string
  aluno: string
  tipo: string
  status: 'confirmado' | 'pendente' | 'cancelado'
  unidade: string
  valor: number
  recorrente: boolean
  observacoes?: string
}

export interface Aluno {
  id: string
  nome: string
  telefone: string
  email: string
  pacoteValor: number
  ultimaAula: string
  frequencia: number
  ativo: boolean
}

export interface Transacao {
  id: string
  data: string
  tipo: 'entrada' | 'saida'
  descricao: string
  valor: number
  categoria: string
}

export interface ProfessorData {
  aulas: Aula[]
  alunos: Aluno[]
  transacoes: Transacao[]
  stats: {
    aulasMes: number
    faturamentoEstimado: number
    totalAlunos: number
    aulasHoje: number
    horasDisponiveis: number
  }
}

const initialData: ProfessorData = {
  aulas: [],
  alunos: [],
  transacoes: [],
  stats: {
    aulasMes: 0,
    faturamentoEstimado: 0,
    totalAlunos: 0,
    aulasHoje: 0,
    horasDisponiveis: 0
  }
}

export function useProfessorData() {
  const { user } = useAuthStore()
  const [data, setData] = useState<ProfessorData>(initialData)
  const [loading, setLoading] = useState(true)

  // Buscar dados reais da API
  useEffect(() => {
    const fetchData = async () => {
      if (!user?.id) {
        setLoading(false)
        return
      }

      try {
        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

        // Buscar agendamentos
        const bookingsResponse = await fetch(
          `${API_URL}/api/bookings?teacher_id=${user.id}`,
          { headers: { 'Content-Type': 'application/json' } }
        )

        if (bookingsResponse.ok) {
          const bookingsData = await bookingsResponse.json()
          const bookings = bookingsData.bookings || []

          // Converter bookings para formato de Aula
          const aulas: Aula[] = bookings.map((b: {
            id: string
            date: string
            studentName: string
            status: string
            creditsCost: number
            notes?: string
          }) => ({
            id: b.id,
            data: new Date(b.date).toISOString().split('T')[0],
            hora: new Date(b.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
            aluno: b.studentName || 'Aluno',
            tipo: 'Treino',
            status: b.status === 'CONFIRMED' ? 'confirmado' : b.status === 'PENDING' ? 'pendente' : 'cancelado',
            unidade: 'Academia',
            valor: b.creditsCost * 70, // Assumindo 70 reais por crédito
            recorrente: false,
            observacoes: b.notes
          }))

          // Calcular estatísticas
          const hoje = new Date().toISOString().split('T')[0]
          const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
          
          const aulasHoje = aulas.filter(a => a.data === hoje && a.status === 'confirmado').length
          const aulasMes = aulas.filter(a => a.data >= inicioMes && a.status === 'confirmado').length
          const faturamentoEstimado = aulas
            .filter(a => a.data >= inicioMes && a.status === 'confirmado')
            .reduce((sum, a) => sum + a.valor, 0)

          setData({
            aulas,
            alunos: [], // TODO: Buscar alunos da API
            transacoes: [], // TODO: Buscar transações da API
            stats: {
              aulasMes,
              faturamentoEstimado,
              totalAlunos: new Set(aulas.map(a => a.aluno)).size,
              aulasHoje,
              horasDisponiveis: 0
            }
          })
        }
      } catch (error) {
        console.error('Erro ao buscar dados:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [user?.id])

  // Salvar dados (não usado mais, mantido para compatibilidade)
  const saveData = (newData: ProfessorData) => {
    setData(newData)
  }

  // Calcular estatísticas
  const calculateStats = (aulas: Aula[], alunos: Aluno[], transacoes: Transacao[]) => {
    const hoje = new Date().toISOString().split('T')[0]
    const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
    
    const aulasHoje = aulas.filter(aula => aula.data === hoje && aula.status === 'confirmado').length
    const aulasMes = aulas.filter(aula => aula.data >= inicioMes && aula.status === 'confirmado').length
    const faturamentoEstimado = transacoes
      .filter(t => t.tipo === 'entrada' && t.data >= inicioMes)
      .reduce((sum, t) => sum + t.valor, 0)
    
    return {
      aulasMes,
      faturamentoEstimado,
      totalAlunos: alunos.filter(a => a.ativo).length,
      aulasHoje,
      horasDisponiveis: 4 // Fixo por enquanto
    }
  }

  // CRUD Aulas
  const addAula = (aula: Omit<Aula, 'id'>) => {
    const newAula: Aula = {
      ...aula,
      id: Date.now().toString()
    }
    const newAulas = [...data.aulas, newAula]
    const newStats = calculateStats(newAulas, data.alunos, data.transacoes)
    
    // Adicionar transação se confirmada
    let newTransacoes = data.transacoes
    if (aula.status === 'confirmado') {
      const transacao: Transacao = {
        id: Date.now().toString(),
        data: aula.data,
        tipo: 'entrada',
        descricao: `Aula - ${aula.aluno}`,
        valor: aula.valor,
        categoria: 'Aula'
      }
      newTransacoes = [...data.transacoes, transacao]
    }
    
    const newData = {
      ...data,
      aulas: newAulas,
      transacoes: newTransacoes,
      stats: newStats
    }
    saveData(newData)
  }

  const updateAula = (id: string, updates: Partial<Aula>) => {
    const newAulas = data.aulas.map(aula => 
      aula.id === id ? { ...aula, ...updates } : aula
    )
    const newStats = calculateStats(newAulas, data.alunos, data.transacoes)
    const newData = { ...data, aulas: newAulas, stats: newStats }
    saveData(newData)
  }

  const deleteAula = (id: string) => {
    const newAulas = data.aulas.filter(aula => aula.id !== id)
    const newStats = calculateStats(newAulas, data.alunos, data.transacoes)
    const newData = { ...data, aulas: newAulas, stats: newStats }
    saveData(newData)
  }

  // CRUD Alunos
  const addAluno = (aluno: Omit<Aluno, 'id'>) => {
    const newAluno: Aluno = {
      ...aluno,
      id: Date.now().toString()
    }
    const newAlunos = [...data.alunos, newAluno]
    const newStats = calculateStats(data.aulas, newAlunos, data.transacoes)
    const newData = { ...data, alunos: newAlunos, stats: newStats }
    saveData(newData)
  }

  const updateAluno = (id: string, updates: Partial<Aluno>) => {
    const newAlunos = data.alunos.map(aluno => 
      aluno.id === id ? { ...aluno, ...updates } : aluno
    )
    const newStats = calculateStats(data.aulas, newAlunos, data.transacoes)
    const newData = { ...data, alunos: newAlunos, stats: newStats }
    saveData(newData)
  }

  const deleteAluno = (id: string) => {
    const newAlunos = data.alunos.filter(aluno => aluno.id !== id)
    const newStats = calculateStats(data.aulas, newAlunos, data.transacoes)
    const newData = { ...data, alunos: newAlunos, stats: newStats }
    saveData(newData)
  }

  // CRUD Transações
  const addTransacao = (transacao: Omit<Transacao, 'id'>) => {
    const newTransacao: Transacao = {
      ...transacao,
      id: Date.now().toString()
    }
    const newTransacoes = [...data.transacoes, newTransacao]
    const newStats = calculateStats(data.aulas, data.alunos, newTransacoes)
    const newData = { ...data, transacoes: newTransacoes, stats: newStats }
    saveData(newData)
  }

  // Filtros
  const getAulasHoje = () => {
    const hoje = new Date().toISOString().split('T')[0]
    return data.aulas.filter(aula => aula.data === hoje)
  }

  const getAulasPorPeriodo = (inicio: string, fim: string) => {
    return data.aulas.filter(aula => aula.data >= inicio && aula.data <= fim)
  }

  const getAlunosAtivos = () => {
    return data.alunos.filter(aluno => aluno.ativo)
  }

  return {
    data,
    loading,
    // CRUD
    addAula,
    updateAula,
    deleteAula,
    addAluno,
    updateAluno,
    deleteAluno,
    addTransacao,
    // Filtros
    getAulasHoje,
    getAulasPorPeriodo,
    getAlunosAtivos,
    // Utilitários
    calculateStats
  }
}
