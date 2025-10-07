import { Router } from 'express'
import { supabase } from '../config/supabase'
import { requireAuth, requireRole, requireFranqueadoraAdmin } from '../middleware/auth'
import { asyncErrorHandler } from '../middleware/errorHandler'
import {
  extractPagination,
  extractFilters,
  buildPaginatedResponse,
  buildOrderClause,
  buildFilterClauses,
  addPaginationHeaders
} from '../middleware/pagination'
import { auditSensitiveOperation } from '../middleware/audit'
import { resolveDefaultFranqueadoraId } from '../services/franqueadora-contacts.service'
import { auditService } from '../services/audit.service'

const router = Router()

// GET /api/franqueadora/me - contexto da franqueadora do admin atual
router.get('/me', requireAuth, requireRole(['FRANQUEADORA', 'SUPER_ADMIN']), requireFranqueadoraAdmin, async (req, res) => {
  try {
    let franqueadoraId = req.franqueadoraAdmin?.franqueadora_id

    // Se for SUPER_ADMIN e não tiver franqueadora específica, buscar a primeira ativa
    if (!franqueadoraId && req.user?.role === 'SUPER_ADMIN') {
      const { data: defaultFranqueadora, error: defaultError } = await supabase
        .from('franqueadora')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: true })
        .limit(1)
        .single()

      if (!defaultError && defaultFranqueadora) {
        franqueadoraId = defaultFranqueadora.id
        return res.json({ franqueadora: defaultFranqueadora })
      }
    }

    if (!franqueadoraId) {
      return res.status(200).json({ franqueadora: null })
    }

    const { data, error } = await supabase
      .from('franqueadora')
      .select('*')
      .eq('id', franqueadoraId)
      .single()
    if (error) throw error
    return res.json({ franqueadora: data })
  } catch (err: any) {
    return res.status(500).json({ error: err.message })
  }
})


router.get('/contacts',
  requireAuth,
  requireRole(['FRANQUEADORA', 'SUPER_ADMIN']),
  extractPagination,
  addPaginationHeaders,
  asyncErrorHandler(async (req, res) => {
    const { pagination } = req as any;
    const queryParams = (req.query || {}) as Record<string, string | undefined>;

    let franqueadoraId = queryParams.franqueadora_id || (req.franqueadoraAdmin && req.franqueadoraAdmin.franqueadora_id) || null;

    if (!franqueadoraId && req.user && req.user.role === 'SUPER_ADMIN') {
      franqueadoraId = await resolveDefaultFranqueadoraId();
    }

    let query = supabase
      .from('franqueadora_contacts')
      .select(
        'id, franqueadora_id, user_id, role, status, origin, assigned_academy_ids, last_assignment_at, created_at, updated_at, user:users (id, name, email, phone, role, is_active, credits, created_at)',
        { count: 'exact' }
      );

    if (franqueadoraId) {
      query = query.eq('franqueadora_id', franqueadoraId);
    }

    const roleFilter = queryParams.role ? String(queryParams.role).toUpperCase() : undefined;
    const statusFilter = queryParams.status ? String(queryParams.status).toUpperCase() : undefined;
    const assignedFlag = queryParams.assigned ? String(queryParams.assigned) : undefined;
    const academyId = queryParams.academy_id ? String(queryParams.academy_id) : undefined;
    const search = queryParams.search ? String(queryParams.search).trim() : undefined;

    if (roleFilter && ['STUDENT', 'TEACHER'].includes(roleFilter)) {
      query = query.eq('role', roleFilter);
    }

    if (statusFilter && ['UNASSIGNED', 'ASSIGNED', 'INACTIVE'].includes(statusFilter)) {
      query = query.eq('status', statusFilter);
    }

    if (academyId) {
      query = query.contains('assigned_academy_ids', [academyId]);
    }

    if (assignedFlag === 'true') {
      query = query.not('assigned_academy_ids', 'eq', '{}');
    } else if (assignedFlag === 'false') {
      query = query.eq('assigned_academy_ids', '{}');
    }

    if (search) {
      const escapedSearch = search.replace(/[%_]/g, function(match) { return '\\' + match; });
      const like = '%' + escapedSearch + '%';
      query = query.or('user.name.ilike.' + like + ',user.email.ilike.' + like);
    }

    const allowedSorts = ['created_at', 'updated_at', 'last_assignment_at'];
    const sortColumn = allowedSorts.indexOf(pagination.sortBy) !== -1 ? pagination.sortBy : 'created_at';
    const ascending = pagination.sortOrder === 'asc';

    query = query
      .order(sortColumn, { ascending })
      .range(pagination.offset, pagination.offset + pagination.limit - 1);

    const { data, error, count } = await query;

    if (error) {
      throw new Error('Erro ao buscar contatos da franqueadora: ' + error.message);
    }

    const response = buildPaginatedResponse(
      data || [],
      count || 0,
      pagination,
      {
        role: roleFilter || null,
        status: statusFilter || null,
        search: search || null,
        assigned: assignedFlag || null,
        academy_id: academyId || null,
      }
    );

    return res.json({
      success: true,
      ...response,
    });
  })
);

// Packages (Franchise Packages) COM PAGINAÇÃO E FILTROS
router.get('/packages',
  requireAuth,
  requireRole(['FRANQUEADORA', 'SUPER_ADMIN']),
  extractPagination,
  extractFilters(['is_active', 'name', 'investment_amount']),
  addPaginationHeaders,
  asyncErrorHandler(async (req, res) => {
    if (!req.franqueadoraAdmin?.franqueadora_id) {
      return res.json({
        success: true,
        data: [],
        pagination: {
          page: 1,
          limit: 20,
          total: 0,
          totalPages: 0,
          hasNext: false,
          hasPrev: false
        }
      })
    }

    const { pagination, filters } = req as any

    // Construir consulta base
    let query = supabase
      .from('franchise_packages')
      .select('*', { count: 'exact' })
      .eq('franqueadora_id', req.franqueadoraAdmin.franqueadora_id)

    // Aplicar filtros
    query = buildFilterClauses(filters, query)

    // Aplicar ordenação (padrão: investment_amount ascendente)
    const sortBy = pagination.sortBy || 'investment_amount'
    const sortOrder = pagination.sortOrder || 'asc'
    const orderClause = buildOrderClause(sortBy, sortOrder)
    query = query.order(Object.keys(orderClause)[0], orderClause[Object.keys(orderClause)[0]])

    // Aplicar paginação
    query = query.range(pagination.offset, pagination.offset + pagination.limit - 1)

    const { data, error, count } = await query

    if (error) {
      throw new Error(`Erro ao buscar pacotes: ${error.message}`)
    }

    const response = buildPaginatedResponse(
      data || [],
      count || 0,
      pagination,
      filters
    )

    return res.json({
      success: true,
      ...response
    })
  })
)

router.post('/packages',
  requireAuth,
  requireRole(['FRANQUEADORA', 'SUPER_ADMIN']),
  auditSensitiveOperation('CREATE', 'franchise_packages'),
  asyncErrorHandler(async (req, res) => {
    if (!req.franqueadoraAdmin?.franqueadora_id) {
      return res.status(400).json({
        success: false,
        error: 'NO_FRANQUEADORA_CONTEXT',
        message: 'Contexto da franqueadora não encontrado'
      })
    }

    const payload = {
      ...req.body,
      franqueadora_id: req.franqueadoraAdmin.franqueadora_id
    }

    const { data, error } = await supabase
      .from('franchise_packages')
      .insert(payload)
      .select()
      .single()

    if (error) {
      throw new Error(`Erro ao criar pacote: ${error.message}`)
    }

    return res.status(201).json({
      success: true,
      data: { package: data }
    })
  })
)

router.put('/packages/:id',
  requireAuth,
  requireRole(['FRANQUEADORA', 'SUPER_ADMIN']),
  auditSensitiveOperation('CREATE', 'franchise_packages'),
  asyncErrorHandler(async (req, res) => {
    if (!req.franqueadoraAdmin?.franqueadora_id) {
      return res.status(400).json({
        success: false,
        error: 'NO_FRANQUEADORA_CONTEXT',
        message: 'Contexto da franqueadora não encontrado'
      })
    }

    const { id } = req.params

    // Verificar propriedade
    const { data: current, error: curErr } = await supabase
      .from('franchise_packages')
      .select('franqueadora_id')
      .eq('id', id)
      .single()

    if (curErr || !current) {
      return res.status(404).json({
        success: false,
        error: 'PACKAGE_NOT_FOUND',
        message: 'Pacote não encontrado'
      })
    }

    if (current.franqueadora_id !== req.franqueadoraAdmin.franqueadora_id) {
      // Log de tentativa de acesso não autorizado
      const auditLogger = auditService
      await auditLogger.logPermissionDenied(req, 'franchise_packages', 'update', id)
      
      return res.status(403).json({
        success: false,
        error: 'INSUFFICIENT_PERMISSIONS',
        message: 'Você não tem permissão para editar este pacote'
      })
    }

    const { data, error } = await supabase
      .from('franchise_packages')
      .update({
        ...req.body,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      throw new Error(`Erro ao atualizar pacote: ${error.message}`)
    }

    return res.json({
      success: true,
      data: { package: data }
    })
  })
)

router.delete('/packages/:id',
  requireAuth,
  requireRole(['FRANQUEADORA', 'SUPER_ADMIN']),
  auditSensitiveOperation('CREATE', 'franchise_packages'),
  asyncErrorHandler(async (req, res) => {
    if (!req.franqueadoraAdmin?.franqueadora_id) {
      return res.status(400).json({
        success: false,
        error: 'NO_FRANQUEADORA_CONTEXT',
        message: 'Contexto da franqueadora não encontrado'
      })
    }

    const { id } = req.params

    // Verificar propriedade
    const { data: current, error: curErr } = await supabase
      .from('franchise_packages')
      .select('franqueadora_id')
      .eq('id', id)
      .single()

    if (curErr || !current) {
      return res.status(404).json({
        success: false,
        error: 'PACKAGE_NOT_FOUND',
        message: 'Pacote não encontrado'
      })
    }

    if (current.franqueadora_id !== req.franqueadoraAdmin.franqueadora_id) {
      // Log de tentativa de acesso não autorizado
      const auditLogger = auditService
      await auditLogger.logPermissionDenied(req, 'franchise_packages', 'delete', id)
      
      return res.status(403).json({
        success: false,
        error: 'INSUFFICIENT_PERMISSIONS',
        message: 'Você não tem permissão para excluir este pacote'
      })
    }

    const { error } = await supabase
      .from('franchise_packages')
      .update({
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)

    if (error) {
      throw new Error(`Erro ao desativar pacote: ${error.message}`)
    }

    return res.status(204).send()
  })
)

// Leads (COM PAGINAÇÃO E FILTROS)
router.get('/leads',
  requireAuth,
  requireRole(['FRANQUEADORA', 'SUPER_ADMIN']),
  extractPagination,
  extractFilters(['status', 'name', 'email', 'phone']),
  addPaginationHeaders,
  asyncErrorHandler(async (req, res) => {
    if (!req.franqueadoraAdmin?.franqueadora_id) {
      return res.json({
        success: true,
        data: [],
        pagination: {
          page: 1,
          limit: 20,
          total: 0,
          totalPages: 0,
          hasNext: false,
          hasPrev: false
        }
      })
    }

    const { pagination, filters } = req as any

    // Construir consulta base
    let query = supabase
      .from('franchise_leads')
      .select('*', { count: 'exact' })
      .eq('franqueadora_id', req.franqueadoraAdmin.franqueadora_id)

    // Aplicar filtros
    query = buildFilterClauses(filters, query)

    // Aplicar ordenação
    const orderClause = buildOrderClause(pagination.sortBy, pagination.sortOrder)
    query = query.order(Object.keys(orderClause)[0], orderClause[Object.keys(orderClause)[0]])

    // Aplicar paginação
    query = query.range(pagination.offset, pagination.offset + pagination.limit - 1)

    const { data, error, count } = await query

    if (error) {
      throw new Error(`Erro ao buscar leads: ${error.message}`)
    }

    const response = buildPaginatedResponse(
      data || [],
      count || 0,
      pagination,
      filters
    )

    return res.json({
      success: true,
      ...response
    })
  })
)

router.put('/leads/:id', requireAuth, requireRole(['FRANQUEADORA', 'SUPER_ADMIN']), async (req, res) => {
  try {
    if (!req.franqueadoraAdmin?.franqueadora_id) return res.status(400).json({ error: 'No franqueadora context' })
    const { id } = req.params
    const { data: current, error: curErr } = await supabase
      .from('franchise_leads')
      .select('franqueadora_id')
      .eq('id', id)
      .single()
    if (curErr || !current) return res.status(404).json({ error: 'Lead not found' })
    if (current.franqueadora_id !== req.franqueadoraAdmin.franqueadora_id) return res.status(403).json({ error: 'Forbidden' })
    const { data, error } = await supabase
      .from('franchise_leads')
      .update({ ...req.body, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return res.json({ lead: data })
  } catch (err: any) {
    return res.status(500).json({ error: err.message })
  }
})

// Academy stats (OTIMIZADO: consulta única agregada com cache)
router.get('/academies/:id/stats', requireAuth, requireRole(['FRANQUEADORA', 'SUPER_ADMIN']), requireFranqueadoraAdmin, asyncErrorHandler(async (req, res) => {
  const { id } = req.params
  if (!req.franqueadoraAdmin?.franqueadora_id) {
    return res.status(400).json({
      success: false,
      error: 'NO_FRANQUEADORA_CONTEXT',
      message: 'Contexto da franqueadora não encontrado'
    })
  }

  // Cache simples por 5 minutos para estatísticas
  const cacheKey = `academy_stats_${id}_${req.franqueadoraAdmin.franqueadora_id}`
  const cacheTime = 5 * 60 * 1000 // 5 minutos

  // Verificar se temos dados em cache (em produção usar Redis)
  if (process.env.NODE_ENV === 'production' && (global as any).cache?.[cacheKey]) {
    const cached = (global as any).cache[cacheKey]
    if (Date.now() - cached.timestamp < cacheTime) {
      return res.json({
        success: true,
        data: cached.data,
        cached: true
      })
    }
  }

  // Verificar permissão e obter dados básicos da academia
  const { data: academy, error: academyErr } = await supabase
    .from('academies')
    .select('id, franqueadora_id, monthly_revenue, name')
    .eq('id', id)
    .single()

  if (academyErr || !academy) {
    return res.status(404).json({
      success: false,
      error: 'ACADEMY_NOT_FOUND',
      message: 'Academia não encontrada'
    })
  }

  if (academy.franqueadora_id !== req.franqueadoraAdmin.franqueadora_id) {
    return res.status(403).json({
      success: false,
      error: 'INSUFFICIENT_PERMISSIONS',
      message: 'Você não tem permissão para acessar esta academia'
    })
  }

  // CONSULTA OTIMIZADA: Usar RPC para obter todas as estatísticas em uma única consulta
  const { data: stats, error: statsError } = await supabase
    .rpc('get_academy_stats', {
      academy_id: id,
      include_revenue: true
    })

  if (statsError) {
    // Fallback para consultas separadas se RPC não estiver disponível
    console.warn('RPC get_academy_stats não disponível, usando fallback')
    
    // Consultas paralelas para melhor performance
    const [
      teachersResult,
      studentsResult,
      bookingsResult
    ] = await Promise.all([
      // Contagem de professores
      supabase
        .from('academy_teachers')
        .select('*', { count: 'exact', head: true })
        .eq('academy_id', id),
      
      // Contagem de alunos (total e ativos)
      supabase
        .from('academy_students')
        .select('status', { count: 'exact' })
        .eq('academy_id', id),
      
      // Estatísticas de agendamentos
      supabase
        .from('bookings')
        .select('status', { count: 'exact' })
        .eq('franchise_id', id)
    ])

    // Processar resultados
    const totalTeachers = teachersResult.count || 0
    const allStudents = studentsResult.data || []
    const totalStudents = allStudents.length
    const activeStudents = allStudents.filter(s => s.status === 'active').length
    
    const allBookings = bookingsResult.data || []
    const totalBookings = allBookings.length
    const completedBookings = allBookings.filter(b => b.status === 'COMPLETED').length
    const cancelledBookings = allBookings.filter(b => b.status === 'CANCELLED').length

    const finalStats = {
      academy: {
        id: academy.id,
        name: academy.name,
        monthlyRevenue: academy.monthly_revenue || 0
      },
      totalStudents,
      activeStudents,
      totalTeachers,
      activeTeachers: totalTeachers, // Assumindo todos os professores estão ativos
      totalBookings,
      completedBookings,
      cancelledBookings,
      completionRate: totalBookings > 0 ? (completedBookings / totalBookings * 100).toFixed(1) : 0,
      creditsBalance: 0,
      plansActive: 0,
      lastUpdated: new Date().toISOString()
    }

    // Salvar em cache
    if (process.env.NODE_ENV === 'production') {
      if (!(global as any).cache) (global as any).cache = {}
      ;(global as any).cache[cacheKey] = {
        data: finalStats,
        timestamp: Date.now()
      }
    }

    return res.json({
      success: true,
      data: finalStats,
      cached: false
    })
  }

  // Se RPC funcionou, usar os dados otimizados
  const finalStats = {
    academy: {
      id: academy.id,
      name: academy.name,
      monthlyRevenue: academy.monthly_revenue || 0
    },
    ...stats,
    lastUpdated: new Date().toISOString()
  }

  // Salvar em cache
  if (process.env.NODE_ENV === 'production') {
    if (!(global as any).cache) (global as any).cache = {}
    ;(global as any).cache[cacheKey] = {
      data: finalStats,
      timestamp: Date.now()
    }
  }

  return res.json({
    success: true,
    data: finalStats,
    cached: false
  })
}))

// GET /api/franqueadora/users - Listar todos os usuários com informações detalhadas
router.get('/users',
  requireAuth,
  requireRole(['FRANQUEADORA', 'SUPER_ADMIN']),
  extractPagination,
  addPaginationHeaders,
  asyncErrorHandler(async (req, res) => {
    const { pagination } = req as any;
    const queryParams = (req.query || {}) as Record<string, string | undefined>;
    const { role, search, status } = queryParams;

    try {
      let franqueadoraId = queryParams.franqueadora_id || (req.franqueadoraAdmin && req.franqueadoraAdmin.franqueadora_id) || null;

      if (!franqueadoraId && req.user && req.user.role === 'SUPER_ADMIN') {
        franqueadoraId = await resolveDefaultFranqueadoraId();
      }

      if (!franqueadoraId) {
        return res.status(400).json({
          error: 'ID da franqueadora não encontrado',
          message: 'Especifique franqueadora_id ou seja admin de uma franqueadora'
        });
      }

      // Construir query base - busca todos os usuários (alunos e professores)
      let query = supabase
        .from('users')
        .select(`
          id,
          name,
          email,
          phone,
          cpf,
          role,
          avatar_url,
          created_at,
          updated_at,
          last_login_at,
          active,
          email_verified,
          phone_verified,
          franchisor_id,
          franchise_id,
          teacher_profiles (
            id,
            specialization,
            bio,
            graduation,
            cref,
            total_sessions,
            hourly_rate,
            available_online,
            available_in_person
          )
        `, { count: 'exact' })
        .in('role', ['STUDENT', 'TEACHER']);

      // Aplicar filtros
      if (role && role !== 'all') {
        query = query.eq('role', role.toUpperCase());
      }

      if (search) {
        query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`);
      }

      if (status === 'active') {
        query = query.eq('active', true);
      } else if (status === 'inactive') {
        query = query.eq('active', false);
      }

      // Ordenação
      query = query.order('created_at', { ascending: false });

      // Paginação
      const { offset, limit } = pagination;
      query = query.range(offset, offset + limit - 1);

      const { data: users, error, count } = await query;

      if (error) {
        console.error('Erro ao buscar usuários:', error);
        throw new Error(`Erro ao buscar usuários: ${error.message}`);
      }

      // Enriquecer dados com estatísticas adicionais
      const enrichedUsers = await Promise.all(users.map(async (user: any) => {
        try {
          // Buscar vínculos operacionais
          const { data: professorUnits } = await supabase
            .from('professor_units')
            .select('unit_id, units(name, city, state)')
            .eq('professor_id', user.id);

          const { data: studentUnits } = await supabase
            .from('student_units')
            .select('unit_id, units(name, city, state), total_bookings, first_booking_date, last_booking_date')
            .eq('student_id', user.id);

          // Buscar estatísticas de agendamentos
          const { data: bookingStats } = await supabase
            .from('bookings')
            .select('status_canonical')
            .or(`professor_id.eq.${user.id},student_id.eq.${user.id}`);

          // Buscar informações de saldo (se for aluno)
          let balanceInfo = null;
          if (user.role === 'STUDENT' || user.role === 'ALUNO') {
            const { data: studentBalances } = await supabase
              .from('student_balances')
              .select('unit_id, total_purchased, total_consumed, locked_qty, units(name, city, state)')
              .eq('student_id', user.id);

            balanceInfo = studentBalances;
          }

          // Buscar informações de horas (se for professor)
          let hoursInfo = null;
          if (user.role === 'TEACHER' || user.role === 'PROFESSOR') {
            const { data: professorBalances } = await supabase
              .from('professor_balances')
              .select('unit_id, total_hours, available_hours, locked_hours, units(name, city, state)')
              .eq('professor_id', user.id);

            hoursInfo = professorBalances;
          }

          return {
            ...user,
            operational_links: {
              professor_units: professorUnits || [],
              student_units: studentUnits || []
            },
            booking_stats: {
              total: bookingStats?.length || 0,
              completed: bookingStats?.filter(b => b.status_canonical === 'DONE').length || 0,
              pending: bookingStats?.filter(b => b.status_canonical === 'RESERVED').length || 0,
              cancelled: bookingStats?.filter(b => b.status_canonical === 'CANCELED').length || 0
            },
            balance_info: balanceInfo,
            hours_info: hoursInfo
          };
        } catch (err) {
          console.error('Erro ao enriquecer dados do usuário:', user.id, err);
          return user;
        }
      }));

      const response = buildPaginatedResponse(enrichedUsers, count, pagination);

      return res.status(200).json({
        success: true,
        ...response,
        filters: {
          role,
          search,
          status,
          franqueadora_id: franqueadoraId
        }
      });
    } catch (err: any) {
      console.error('Erro ao listar usuários:', err);
      return res.status(500).json({
        error: err.message || 'Erro ao listar usuários',
        message: 'Não foi possível carregar a lista de usuários'
      });
    }
  })
);

export default router
