'use client'

import { useState, useEffect } from 'react'

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

const STORAGE_KEY = 'professor-data'

const initialData: ProfessorData = {
  aulas: [
    {
      id: '1',
      data: new Date().toISOString().split('T')[0],
      hora: '15:00',
      aluno: 'João Silva',
      tipo: 'Musculação',
      status: 'confirmado',
      unidade: 'Centro',
      valor: 70,
      recorrente: false,
      observacoes: 'Primeira aula experimental'
    }
  ],
  alunos: [
    {
      id: '1',
      nome: 'João Silva',
      telefone: '(11) 99999-1234',
      email: 'joao@email.com',
      pacoteValor: 140,
      ultimaAula: '2024-01-20',
      frequencia: 100,
      ativo: true
    },
    {
      id: '2',
      nome: 'Maria Santos',
      telefone: '(11) 99999-5678',
      email: 'maria@email.com',
      pacoteValor: 210,
      ultimaAula: '2024-01-18',
      frequencia: 75,
      ativo: true
    },
    {
      id: '3',
      nome: 'Carlos Lima',
      telefone: '(11) 99999-9012',
      email: 'carlos@email.com',
      pacoteValor: 280,
      ultimaAula: '2024-01-15',
      frequencia: 50,
      ativo: false
    }
  ],
  transacoes: [
    {
      id: '1',
      data: new Date().toISOString().split('T')[0],
      tipo: 'entrada',
      descricao: 'Aula - João Silva',
      valor: 70,
      categoria: 'Aula'
    }
  ],
  stats: {
    aulasMes: 5,
    faturamentoEstimado: 350,
    totalAlunos: 3,
    aulasHoje: 1,
    horasDisponiveis: 2
  }
}

export function useProfessorData() {
  const [data, setData] = useState<ProfessorData>(initialData)
  const [loading, setLoading] = useState(true)

  // Carregar dados do localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsedData = JSON.parse(stored)
        setData(parsedData)
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  // Salvar dados no localStorage
  const saveData = (newData: ProfessorData) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newData))
      setData(newData)
    } catch (error) {
      console.error('Erro ao salvar dados:', error)
    }
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
