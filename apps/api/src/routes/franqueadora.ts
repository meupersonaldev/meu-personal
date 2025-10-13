import { Router } from 'express'
import { supabase } from '../lib/supabase'
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
import { cacheService } from '../services/cache.service'
import { FRANQUEADORA_CONTACTS_SELECT } from '../dto/franqueadora-contacts'

const router = Router()

// GET /api/franqueadora/me - contexto da franqueadora do admin atual
router.get('/me', requireAuth, requireRole(['FRANQUEADORA', 'SUPER_ADMIN', 'ADMIN']), requireFranqueadoraAdmin, async (req, res) => {
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
  requireRole(['FRANQUEADORA', 'SUPER_ADMIN', 'ADMIN']),
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
        FRANQUEADORA_CONTACTS_SELECT,
        { count: 'exact' }
      );

    if (franqueadoraId) {
      query = query.eq('franqueadora_id', franqueadoraId);
    }

    const roleFilter = queryParams.role ? String(queryParams.role).toUpperCase() : undefined;
    const statusFilter = queryParams.status ? String(queryParams.status).toUpperCase() : undefined;
    const assignedFlag = queryParams.assigned ? String(queryParams.assigned) : undefined;
    const academyId = queryParams.academy_id ? String(queryParams.academy_id) : undefined;
    const userActiveParam = queryParams.user_active;
    const userActive = typeof userActiveParam === 'string'
      ? (userActiveParam === 'true' || userActiveParam === '1')
      : undefined;
    const isStudent = roleFilter === 'STUDENT';
    const search = queryParams.search ? String(queryParams.search).trim() : undefined;

    if (roleFilter && ['STUDENT', 'TEACHER'].includes(roleFilter)) {
      query = query.eq('role', roleFilter);
    }

    if (statusFilter && ['UNASSIGNED', 'ASSIGNED', 'INACTIVE'].includes(statusFilter)) {
      if (isStudent) {
        // Para STUDENT, ignorar ASSIGNED/UNASSIGNED (aluno não fica atrelado a unidade). Permitir apenas INACTIVE.
        if (statusFilter === 'INACTIVE') {
          query = query.eq('status', 'INACTIVE');
        }
      } else {
        query = query.eq('status', statusFilter);
      }
    }

    // Filtros de atribuição só fazem sentido para TEACHER
    if (!isStudent && academyId) {
      query = query.contains('assigned_academy_ids', [academyId]);
    }

    if (!isStudent) {
      if (assignedFlag === 'true') {
        query = query.not('assigned_academy_ids', 'eq', '{}');
      } else if (assignedFlag === 'false') {
        query = query.eq('assigned_academy_ids', '{}');
      }
    }

    // Filtro de status do usuário (ativo/inativo) proveniente da UI
    if (typeof userActive === 'boolean') {
      query = query.eq('user.is_active', userActive);
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
  requireRole(['FRANQUEADORA', 'SUPER_ADMIN', 'ADMIN']),
  requireFranqueadoraAdmin,
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
  requireRole(['FRANQUEADORA', 'SUPER_ADMIN', 'ADMIN']),
  requireFranqueadoraAdmin,
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
  requireRole(['FRANQUEADORA', 'SUPER_ADMIN', 'ADMIN']),
  requireFranqueadoraAdmin,
  auditSensitiveOperation('UPDATE', 'franchise_packages'),
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
  requireRole(['FRANQUEADORA', 'SUPER_ADMIN', 'ADMIN']),
  requireFranqueadoraAdmin,
  auditSensitiveOperation('DELETE', 'franchise_packages'),
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
  requireRole(['FRANQUEADORA', 'SUPER_ADMIN', 'ADMIN']),
  requireFranqueadoraAdmin,
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

router.put('/leads/:id', requireAuth, requireRole(['FRANQUEADORA', 'SUPER_ADMIN', 'ADMIN']), requireFranqueadoraAdmin, async (req, res) => {
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
router.get('/academies/:id/stats', requireAuth, requireRole(['FRANQUEADORA', 'SUPER_ADMIN', 'ADMIN']), requireFranqueadoraAdmin, asyncErrorHandler(async (req, res) => {
  const { id } = req.params
  if (!req.franqueadoraAdmin?.franqueadora_id) {
    return res.status(400).json({
      success: false,
      error: 'NO_FRANQUEADORA_CONTEXT',
      message: 'Contexto da franqueadora não encontrado'
    })
  }

  // Cache distribuído por 5 minutos para estatísticas
  const cacheKey = `academy_stats_${id}_${req.franqueadoraAdmin.franqueadora_id}`
  const cacheTime = 5 * 60 * 1000 // 5 minutos

  // Verificar cache distribuído
  const cachedStats = await cacheService.get(cacheKey)
  if (cachedStats) {
    return res.json({
      success: true,
      data: cachedStats,
      cached: true
    })
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
      totalBookingsResult,
      completedBookingsResult,
      cancelledBookingsResult
    ] = await Promise.all([
      // Contagem de professores
      supabase
        .from('academy_teachers')
        .select('*', { count: 'exact', head: true })
        .eq('academy_id', id),
      
      // Alunos (dados para contar ativos)
      supabase
        .from('academy_students')
        .select('status')
        .eq('academy_id', id),
      
      // Estatísticas de agendamentos (contagens com head:true)
      supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .eq('academy_id', id),
      supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .eq('academy_id', id)
        .eq('status_canonical', 'DONE'),
      supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .eq('academy_id', id)
        .eq('status_canonical', 'CANCELED')
    ])

    // Processar resultados
    const totalTeachers = teachersResult.count || 0
    const allStudents = studentsResult.data || []
    const totalStudents = allStudents.length
    const activeStudents = allStudents.filter(s => s.status === 'active').length
    
    const totalBookings = totalBookingsResult.count || 0
    const completedBookings = completedBookingsResult.count || 0
    const cancelledBookings = cancelledBookingsResult.count || 0

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

    // Salvar em cache distribuído
    await cacheService.set(cacheKey, finalStats, cacheTime)

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

  // Salvar em cache distribuído
  await cacheService.set(cacheKey, finalStats, cacheTime)

  return res.json({
    success: true,
    data: finalStats,
    cached: false
  })
}))

// GET /api/franqueadora/users - Listar todos os usuários com informações detalhadas
router.get('/users',
  requireAuth,
  requireRole(['FRANQUEADORA', 'SUPER_ADMIN', 'ADMIN']),
  extractPagination,
  addPaginationHeaders,
  asyncErrorHandler(async (req, res) => {
    const { pagination } = req as any;
    const queryParams = (req.query || {}) as Record<string, string | undefined>;
    const { role, search, status } = queryParams;

    try {
      // Usuários são globais - não filtrar por franqueadora
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
        .in('role', ['STUDENT', 'TEACHER', 'ALUNO', 'PROFESSOR']);

      // Aplicar filtros
      if (role && role !== 'all') {
        const r = role.toUpperCase();
        if (r === 'STUDENT' || r === 'ALUNO') {
          query = query.in('role', ['STUDENT', 'ALUNO']);
        } else if (r === 'TEACHER' || r === 'PROFESSOR') {
          query = query.in('role', ['TEACHER', 'PROFESSOR']);
        } else {
          query = query.eq('role', r);
        }
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

      // Otimização: buscar dados complementares em lote para evitar N+1
      const userIds = users.map(u => u.id);
      const studentIds = users.filter(u => u.role === 'STUDENT' || u.role === 'ALUNO').map(u => u.id);
      const teacherIds = users.filter(u => u.role === 'TEACHER' || u.role === 'PROFESSOR').map(u => u.id);

      // Buscar todos os dados complementares em paralelo
      const [
        allProfessorUnits,
        allStudentUnits,
        allBookingStats,
        allStudentBalances,
        allProfessorBalances
      ] = await Promise.all([
        // Professor units
        teacherIds.length > 0 ? supabase
          .from('professor_units')
          .select('professor_id, unit_id, units(name, city, state)')
          .in('professor_id', teacherIds) : Promise.resolve({ data: [] }),
        
        // Student units  
        studentIds.length > 0 ? supabase
          .from('student_units')
          .select('student_id, unit_id, units(name, city, state), total_bookings, first_booking_date, last_booking_date')
          .in('student_id', studentIds) : Promise.resolve({ data: [] }),
        
        // Booking stats
        userIds.length > 0 ? supabase
          .from('bookings')
          .select('professor_id, student_id, status_canonical')
          .or(`professor_id.in.(${userIds.join(',')}),student_id.in.(${userIds.join(',')})`) : Promise.resolve({ data: [] }),
        
        // Student balances
        studentIds.length > 0 ? supabase
          .from('student_class_balance')
          .select('student_id, unit_id, total_purchased, total_consumed, locked_qty')
          .in('student_id', studentIds) : Promise.resolve({ data: [] }),
        
        // Professor balances
        teacherIds.length > 0 ? supabase
          .from('prof_hour_balance')
          .select('professor_id, unit_id, total_hours, available_hours, locked_hours')
          .in('professor_id', teacherIds) : Promise.resolve({ data: [] })
      ]);

      // Agrupar dados por usuário
      const professorUnitsMap = new Map();
      (allProfessorUnits.data || []).forEach(pu => {
        if (!professorUnitsMap.has(pu.professor_id)) professorUnitsMap.set(pu.professor_id, []);
        professorUnitsMap.get(pu.professor_id).push(pu);
      });

      const studentUnitsMap = new Map();
      (allStudentUnits.data || []).forEach(su => {
        if (!studentUnitsMap.has(su.student_id)) studentUnitsMap.set(su.student_id, []);
        studentUnitsMap.get(su.student_id).push(su);
      });

      const bookingStatsMap = new Map();
      (allBookingStats.data || []).forEach(booking => {
        const userId = booking.professor_id || booking.student_id;
        if (userId) {
          if (!bookingStatsMap.has(userId)) bookingStatsMap.set(userId, []);
          bookingStatsMap.get(userId).push(booking);
        }
      });

      const studentBalancesMap = new Map();
      (allStudentBalances.data || []).forEach(balance => {
        if (!studentBalancesMap.has(balance.student_id)) studentBalancesMap.set(balance.student_id, []);
        studentBalancesMap.get(balance.student_id).push(balance);
      });

      const professorBalancesMap = new Map();
      (allProfessorBalances.data || []).forEach(balance => {
        if (!professorBalancesMap.has(balance.professor_id)) professorBalancesMap.set(balance.professor_id, []);
        professorBalancesMap.get(balance.professor_id).push(balance);
      });

      // Enriquecer usuários com dados agrupados
      const enrichedUsers = users.map((user: any) => {
        const userBookings = bookingStatsMap.get(user.id) || [];
        
        return {
          ...user,
          operational_links: {
            professor_units: professorUnitsMap.get(user.id) || [],
            student_units: studentUnitsMap.get(user.id) || []
          },
          booking_stats: {
            total: userBookings.length,
            completed: userBookings.filter(b => b.status_canonical === 'DONE').length,
            pending: userBookings.filter(b => b.status_canonical === 'RESERVED').length,
            cancelled: userBookings.filter(b => b.status_canonical === 'CANCELED').length
          },
          balance_info: studentBalancesMap.get(user.id) || null,
          hours_info: professorBalancesMap.get(user.id) || null
        };
      });

      const response = buildPaginatedResponse(enrichedUsers, count, pagination);

      return res.status(200).json({
        success: true,
        ...response,
        filters: {
          role,
          search,
          status
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
