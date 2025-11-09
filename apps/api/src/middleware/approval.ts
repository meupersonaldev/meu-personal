import { Request, Response, NextFunction } from 'express'
import { supabase } from '../lib/supabase'

/**
 * Middleware para verificar se o professor está aprovado
 * Bloqueia ações críticas para professores pendentes ou reprovados
 */
export const requireApprovedTeacher = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user
    
    // Se não for professor, permite continuar
    if (!user || (user.role !== 'TEACHER' && user.role !== 'PROFESSOR')) {
      return next()
    }

    // Buscar status de aprovação do professor
    const { data: userData, error } = await supabase
      .from('users')
      .select('approval_status')
      .eq('id', user.userId)
      .single()

    if (error) {
      console.error('Error fetching user approval status:', error)
      return res.status(500).json({ 
        error: 'Erro ao verificar status de aprovação' 
      })
    }

    // Verificar se está aprovado
    if (userData.approval_status !== 'approved') {
      return res.status(403).json({ 
        error: 'Seu cadastro está pendente de aprovação. Aguarde a análise da administração.',
        approval_status: userData.approval_status
      })
    }

    // Professor aprovado, pode continuar
    next()
  } catch (error) {
    console.error('Error in requireApprovedTeacher middleware:', error)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
}
