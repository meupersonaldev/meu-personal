import { Request, Response, NextFunction } from 'express'

// Interface para parâmetros de paginação
export interface PaginationParams {
  page: number
  limit: number
  offset: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

// Interface para resposta paginada
export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
  filters?: any
}

// Middleware para extrair e validar parâmetros de paginação
export const extractPagination = (req: Request, res: Response, next: NextFunction): void => {
  const {
    page = '1',
    limit = '20',
    sortBy,
    sortOrder = 'desc'
  } = req.query

  // Validar e converter parâmetros
  const pageNum = Math.max(1, parseInt(page as string, 10))
  const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10))) // Max 100 itens por página
  
  // Valores padrão para ordenação
  const allowedSortOrders = ['asc', 'desc']
  const finalSortOrder = allowedSortOrders.includes(sortOrder as string) 
    ? sortOrder as 'asc' | 'desc' 
    : 'desc'

  // Adicionar ao request para uso posterior
  ;(req as any).pagination = {
    page: pageNum,
    limit: limitNum,
    offset: (pageNum - 1) * limitNum,
    sortBy: sortBy as string,
    sortOrder: finalSortOrder
  }

  next()
}

// Middleware para extrair filtros comuns
export const extractFilters = (allowedFilters: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const filters: any = {}
    
    // Extrair apenas filtros permitidos
    allowedFilters.forEach(filter => {
      if (req.query[filter] !== undefined && req.query[filter] !== '') {
        filters[filter] = req.query[filter]
      }
    })

    // Adicionar filtros de data comuns
    if (req.query.startDate) {
      filters.startDate = req.query.startDate
    }
    if (req.query.endDate) {
      filters.endDate = req.query.endDate
    }
    if (req.query.search) {
      filters.search = req.query.search
    }

    // Adicionar ao request para uso posterior
    ;(req as any).filters = filters

    next()
  }
}

// Função helper para construir resposta paginada
export const buildPaginatedResponse = <T>(
  data: T[],
  total: number,
  pagination: PaginationParams,
  filters?: any
): PaginatedResponse<T> => {
  const totalPages = Math.ceil(total / pagination.limit)
  
  return {
    data,
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      total,
      totalPages,
      hasNext: pagination.page < totalPages,
      hasPrev: pagination.page > 1
    },
    filters
  }
}

// Função helper para construir cláusula ORDER BY para Supabase
export const buildOrderClause = (sortBy?: string, sortOrder: 'asc' | 'desc' = 'desc'): any => {
  if (!sortBy) {
    return { created_at: { ascending: sortOrder === 'asc' } }
  }
  
  // Mapear campos comuns para nomes de coluna
  const fieldMap: Record<string, string> = {
    'name': 'name',
    'email': 'email',
    'createdAt': 'created_at',
    'updatedAt': 'updated_at',
    'status': 'status',
    'amount': 'amount',
    'date': 'date'
  }
  
  const columnName = fieldMap[sortBy] || sortBy
  return { [columnName]: { ascending: sortOrder === 'asc' } }
}

// Função helper para construir cláusulas de filtro para Supabase
export const buildFilterClauses = (filters: any, query: any): any => {
  if (!filters) return query
  
  Object.entries(filters).forEach(([key, value]) => {
    if (value === undefined || value === '') return
    
    switch (key) {
      case 'search':
        // Busca textual em múltiplos campos
        query = query.or(`name.ilike.%${value}%,email.ilike.%${value}%`)
        break
        
      case 'status':
        query = query.eq('status', value)
        break
        
      case 'startDate':
        query = query.gte('created_at', value)
        break
        
      case 'endDate':
        query = query.lte('created_at', value)
        break
        
      case 'franqueadora_id':
        query = query.eq('franqueadora_id', value)
        break
        
      case 'academy_id':
        query = query.eq('academy_id', value)
        break
        
      case 'is_active':
        query = query.eq('is_active', value === 'true')
        break
        
      default:
        // Para campos desconhecidos, usar igualdade
        query = query.eq(key, value)
        break
    }
  })
  
  return query
}

// Middleware para adicionar headers de paginação à resposta
export const addPaginationHeaders = (req: Request, res: Response, next: NextFunction): void => {
  const originalJson = res.json
  
  res.json = function(data: any) {
    // Se for uma resposta paginada, adicionar headers
    if (data && data.pagination) {
      const { pagination } = data
      
      res.set({
        'X-Total-Count': pagination.total.toString(),
        'X-Page': pagination.page.toString(),
        'X-Per-Page': pagination.limit.toString(),
        'X-Total-Pages': pagination.totalPages.toString(),
        'X-Has-Next': pagination.hasNext.toString(),
        'X-Has-Prev': pagination.hasPrev.toString()
      })
    }
    
    return originalJson.call(this, data)
  }
  
  next()
}