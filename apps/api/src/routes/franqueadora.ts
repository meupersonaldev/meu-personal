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
import { asaasService } from '../services/asaas.service'
import { FRANQUEADORA_CONTACTS_SELECT, FRANQUEADORA_CONTACTS_USER_FIELDS } from '../dto/franqueadora-contacts'

const router = Router()

// GET /api/franqueadora/me - contexto da franqueadora do admin atual
router.get('/me', requireAuth, requireRole(['SUPER_ADMIN']), requireFranqueadoraAdmin, async (req, res) => {
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

// GET /api/franqueadora/users-stats - Estatísticas reais de usuários (não paginado)
router.get('/users-stats',
  requireAuth,
  requireRole(['SUPER_ADMIN']),
  asyncErrorHandler(async (req, res) => {
    const queryParams = (req.query || {}) as Record<string, string | undefined>

    let franqueadoraId = queryParams.franqueadora_id || (req.franqueadoraAdmin && req.franqueadoraAdmin.franqueadora_id) || null

    if (!franqueadoraId && req.user && req.user.role === 'SUPER_ADMIN') {
      franqueadoraId = await resolveDefaultFranqueadoraId()
    }

    if (!franqueadoraId) {
      return res.json({
        success: true,
        stats: { total: 0, active: 0, teachers: 0, students: 0 }
      })
    }

    // Buscar contagens reais da tabela users (não apenas franqueadora_contacts)
    // para incluir todos os usuários da plataforma
    const [totalResult, activeResult, teachersResult, studentsResult] = await Promise.all([
      // Total de usuários (STUDENT e TEACHER)
      supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .in('role', ['STUDENT', 'TEACHER']),

      // Usuários ativos
      supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .in('role', ['STUDENT', 'TEACHER'])
        .eq('is_active', true),

      // Professores
      supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'TEACHER'),

      // Alunos
      supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'STUDENT')
    ])

    return res.json({
      success: true,
      stats: {
        total: totalResult.count || 0,
        active: activeResult.count || 0,
        teachers: teachersResult.count || 0,
        students: studentsResult.count || 0
      }
    })
  })
)


router.get('/contacts',
  requireAuth,
  requireRole(['SUPER_ADMIN']),
  extractPagination,
  addPaginationHeaders,
  asyncErrorHandler(async (req, res) => {
    const { pagination } = req as any;
    const queryParams = (req.query || {}) as Record<string, string | undefined>;

    let franqueadoraId = queryParams.franqueadora_id || (req.franqueadoraAdmin && req.franqueadoraAdmin.franqueadora_id) || null;

    if (!franqueadoraId && req.user && req.user.role === 'SUPER_ADMIN') {
      franqueadoraId = await resolveDefaultFranqueadoraId();
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

    // Buscar todos os usuários (STUDENT e TEACHER) diretamente da tabela users
    // para incluir também os que não estão na tabela franqueadora_contacts
    let usersQuery = supabase
      .from('users')
      .select(FRANQUEADORA_CONTACTS_USER_FIELDS, { count: 'exact' })
      .in('role', ['STUDENT', 'TEACHER']);

    // Aplicar filtro de is_active apenas se especificado
    // Se não especificado, traz todos (ativos e inativos)
    if (typeof userActive === 'boolean') {
      usersQuery = usersQuery.eq('is_active', userActive);
    }

    // Aplicar filtros de usuário
    if (roleFilter && ['STUDENT', 'TEACHER'].includes(roleFilter)) {
      usersQuery = usersQuery.eq('role', roleFilter);
    }

    if (search) {
      const escapedSearch = search.replace(/[%_]/g, function (match) { return '\\' + match; });
      const like = '%' + escapedSearch + '%';
      usersQuery = usersQuery.or(`name.ilike.${like},email.ilike.${like}`);
    }

    // Buscar todos os usuários primeiro (sem paginação para contar total)
    const { data: allUsers, error: usersError, count: totalUsersCount } = await usersQuery;

    if (usersError) {
      throw new Error('Erro ao buscar usuários: ' + usersError.message);
    }

    // Buscar contatos da franqueadora para enriquecer os dados
    // Buscar TODOS os contatos (não filtrar por franqueadora_id aqui)
    // porque queremos incluir todos os usuários, mesmo os sem contato
    const { data: allContacts, error: contactsError } = await supabase
      .from('franqueadora_contacts')
      .select('*');

    if (contactsError) {
      throw new Error('Erro ao buscar contatos: ' + contactsError.message);
    }

    // Criar mapa de contatos por user_id
    // Se houver franqueadoraId, priorizar contatos dessa franqueadora
    const contactsMap = new Map();
    (allContacts || []).forEach((contact: any) => {
      const existing = contactsMap.get(contact.user_id);
      // Se já existe um contato e temos franqueadoraId, priorizar o da franqueadora correta
      if (!existing || (franqueadoraId && contact.franqueadora_id === franqueadoraId)) {
        contactsMap.set(contact.user_id, contact);
      }
    });

    // Combinar usuários com contatos e aplicar filtros adicionais
    // INCLUIR TODOS OS USUÁRIOS, mesmo os sem contato
    // Como agora só há uma franqueadora, incluir todos os usuários
    let combinedData = (allUsers || []).map((user: any) => {
      const contact = contactsMap.get(user.id);

      // Como agora só há uma franqueadora, incluir todos os usuários
      // Se houver contato, usar os dados do contato; caso contrário, criar estrutura padrão
      return {
        id: contact?.id || null,
        franqueadora_id: contact?.franqueadora_id || franqueadoraId || null,
        user_id: user.id,
        role: user.role,
        status: contact?.status || 'UNASSIGNED',
        origin: contact?.origin || 'SELF_REGISTRATION',
        assigned_academy_ids: contact?.assigned_academy_ids || [],
        last_assignment_at: contact?.last_assignment_at || null,
        created_at: contact?.created_at || user.created_at,
        updated_at: contact?.updated_at || user.updated_at,
        user: user
      };
    });

    // Buscar informações de professor fonte para alunos que vieram de lead de professor
    // Fetch teacher source for students with TEACHER_LEAD origin
    const studentUserIds = combinedData
      .filter((item: any) => item.role === 'STUDENT' && item.origin === 'TEACHER_LEAD')
      .map((item: any) => item.user_id);

    let teacherSourceMap = new Map<string, { teacher_id: string; teacher_name: string }>();

    if (studentUserIds.length > 0) {
      // Buscar vínculos teacher_students para esses alunos
      const { data: teacherStudentLinks } = await supabase
        .from('teacher_students')
        .select('user_id, teacher_id')
        .in('user_id', studentUserIds);

      if (teacherStudentLinks && teacherStudentLinks.length > 0) {
        // Buscar nomes dos professores
        const teacherIds = [...new Set(teacherStudentLinks.map((l: any) => l.teacher_id))];
        const { data: teachers } = await supabase
          .from('users')
          .select('id, name')
          .in('id', teacherIds);

        const teacherNamesMap = new Map((teachers || []).map((t: any) => [t.id, t.name]));

        // Mapear student -> primeiro professor que adicionou (o primeiro vínculo)
        teacherStudentLinks.forEach((link: any) => {
          if (!teacherSourceMap.has(link.user_id)) {
            teacherSourceMap.set(link.user_id, {
              teacher_id: link.teacher_id,
              teacher_name: teacherNamesMap.get(link.teacher_id) || 'Professor'
            });
          }
        });
      }
    }

    // Adicionar teacher_lead_source aos dados combinados
    combinedData = combinedData.map((item: any) => {
      if (item.origin === 'TEACHER_LEAD' && teacherSourceMap.has(item.user_id)) {
        return {
          ...item,
          teacher_lead_source: teacherSourceMap.get(item.user_id)
        };
      }
      return item;
    });

    // Aplicar filtros de contato
    if (statusFilter && ['UNASSIGNED', 'ASSIGNED', 'INACTIVE'].includes(statusFilter)) {
      if (isStudent) {
        if (statusFilter === 'INACTIVE') {
          combinedData = combinedData.filter((item: any) => item.status === 'INACTIVE');
        }
      } else {
        combinedData = combinedData.filter((item: any) => item.status === statusFilter);
      }
    }

    // Filtros de atribuição só fazem sentido para TEACHER
    if (!isStudent && academyId) {
      combinedData = combinedData.filter((item: any) =>
        (item.assigned_academy_ids || []).includes(academyId)
      );
    }

    if (!isStudent) {
      if (assignedFlag === 'true') {
        combinedData = combinedData.filter((item: any) =>
          (item.assigned_academy_ids || []).length > 0
        );
      } else if (assignedFlag === 'false') {
        combinedData = combinedData.filter((item: any) =>
          (item.assigned_academy_ids || []).length === 0
        );
      }
    }

    // Ordenação
    const allowedSorts = ['created_at', 'updated_at', 'last_assignment_at'];
    const sortColumn = allowedSorts.indexOf(pagination.sortBy) !== -1 ? pagination.sortBy : 'created_at';
    const ascending = pagination.sortOrder === 'asc';

    combinedData.sort((a: any, b: any) => {
      const aVal = a[sortColumn] || '';
      const bVal = b[sortColumn] || '';
      return ascending
        ? (aVal > bVal ? 1 : -1)
        : (aVal < bVal ? 1 : -1);
    });

    // Paginação
    const total = combinedData.length;
    const paginatedData = combinedData.slice(
      pagination.offset,
      pagination.offset + pagination.limit
    );

    const response = buildPaginatedResponse(
      paginatedData,
      total,
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
  requireRole(['SUPER_ADMIN']),
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
  requireRole(['SUPER_ADMIN']),
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
  requireRole(['SUPER_ADMIN']),
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
  requireRole(['SUPER_ADMIN']),
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
  requireRole(['SUPER_ADMIN']),
  requireFranqueadoraAdmin,
  extractPagination,
  extractFilters(['status', 'name', 'email', 'phone']),
  addPaginationHeaders,
  asyncErrorHandler(async (req, res) => {
    const franqueadoraId = req.franqueadoraAdmin?.franqueadora_id
    console.log('[LEADS GET] Franqueadora ID do admin:', franqueadoraId)
    console.log('[LEADS GET] User ID:', req.user?.userId)
    console.log('[LEADS GET] User Role:', req.user?.role)

    if (!franqueadoraId) {
      console.log('[LEADS GET] ⚠️ Nenhum franqueadora_id encontrado, retornando array vazio')
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
    console.log('[LEADS GET] Buscando leads para franqueadora_id:', franqueadoraId)

    // Construir consulta base
    let query = supabase
      .from('franchise_leads')
      .select('*', { count: 'exact' })
      .eq('franqueadora_id', franqueadoraId)

    // Aplicar filtros
    query = buildFilterClauses(filters, query)

    // Aplicar ordenação
    const orderClause = buildOrderClause(pagination.sortBy, pagination.sortOrder)
    query = query.order(Object.keys(orderClause)[0], orderClause[Object.keys(orderClause)[0]])

    // Aplicar paginação
    query = query.range(pagination.offset, pagination.offset + pagination.limit - 1)

    const { data, error, count } = await query

    if (error) {
      console.error('[LEADS GET] Erro na query:', error)
      throw new Error(`Erro ao buscar leads: ${error.message}`)
    }

    console.log('[LEADS GET] Leads encontrados:', count || 0)
    console.log('[LEADS GET] Dados retornados:', data?.length || 0, 'registros')

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

// POST /api/franqueadora/leads - Criar lead (público, sem autenticação)
router.post('/leads', asyncErrorHandler(async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      city,
      investment_capacity,
      message
    } = req.body

    console.log('[LEADS] Recebido formulário:', { name, email, phone, city })

    // Validação básica
    if (!name || !email) {
      console.log('[LEADS] Validação falhou: nome ou email faltando')
      return res.status(400).json({ error: 'Nome e email são obrigatórios' })
    }

    // Buscar franqueadora padrão (primeira ativa ou qualquer uma se não houver ativa)
    let { data: defaultFranqueadora, error: franqueadoraError } = await supabase
      .from('franqueadora')
      .select('id')
      .eq('is_active', true)
      .order('created_at', { ascending: true })
      .limit(1)
      .single()

    // Se não encontrar ativa, buscar qualquer uma
    if (franqueadoraError || !defaultFranqueadora) {
      console.log('[LEADS] Não encontrou franqueadora ativa, buscando qualquer uma...')
      const { data: anyFranqueadora, error: anyError } = await supabase
        .from('franqueadora')
        .select('id')
        .order('created_at', { ascending: true })
        .limit(1)
        .single()

      if (anyError || !anyFranqueadora) {
        console.error('[LEADS] Erro ao buscar franqueadora:', anyError || franqueadoraError)
        console.error('[LEADS] Nenhuma franqueadora encontrada no banco de dados')
        return res.status(500).json({
          error: 'Erro ao processar solicitação. Sistema temporariamente indisponível.'
        })
      }
      defaultFranqueadora = anyFranqueadora
    }

    console.log('[LEADS] Franqueadora encontrada:', defaultFranqueadora.id)

    // Criar lead
    const leadData = {
      franqueadora_id: defaultFranqueadora.id,
      name,
      email,
      phone: phone || null,
      city: city || null,
      investment_capacity: investment_capacity || null,
      message: message || null,
      status: 'NEW'
    }

    console.log('[LEADS] Tentando inserir lead:', leadData)

    const { data, error } = await supabase
      .from('franchise_leads')
      .insert(leadData)
      .select()
      .single()

    if (error) {
      console.error('[LEADS] Erro ao criar lead:', error)
      console.error('[LEADS] Código do erro:', error.code)
      console.error('[LEADS] Mensagem do erro:', error.message)
      console.error('[LEADS] Detalhes do erro:', JSON.stringify(error, null, 2))

      // Se a tabela não existir, retornar erro específico
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        console.error('[LEADS] Tabela franchise_leads não existe! Execute a migração.')
        return res.status(500).json({
          error: 'Tabela de leads não configurada. Contate o suporte técnico.'
        })
      }

      throw error
    }

    console.log('[LEADS] Lead criado com sucesso:', data?.id)

    return res.status(201).json({
      success: true,
      message: 'Sua solicitação foi enviada com sucesso! Entraremos em contato em breve.',
      lead: data
    })
  } catch (error: any) {
    console.error('[LEADS] Error creating franchise lead:', error)
    console.error('[LEADS] Stack:', error.stack)
    return res.status(500).json({
      error: error.message || 'Erro ao processar solicitação',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    })
  }
}))

// DELETE /api/franqueadora/leads/:id - Deletar lead
router.delete('/leads/:id',
  requireAuth,
  requireRole(['SUPER_ADMIN']),
  requireFranqueadoraAdmin,
  asyncErrorHandler(async (req, res) => {
    const { id } = req.params
    const franqueadoraId = req.franqueadoraAdmin?.franqueadora_id

    if (!franqueadoraId) {
      return res.status(403).json({ error: 'Franqueadora não identificada' })
    }

    // Verificar se o lead pertence à franqueadora do admin
    const { data: lead, error: fetchError } = await supabase
      .from('franchise_leads')
      .select('id, franqueadora_id')
      .eq('id', id)
      .eq('franqueadora_id', franqueadoraId)
      .single()

    if (fetchError || !lead) {
      return res.status(404).json({ error: 'Lead não encontrado ou acesso não autorizado' })
    }

    // Deletar o lead
    const { error: deleteError } = await supabase
      .from('franchise_leads')
      .delete()
      .eq('id', id)
      .eq('franqueadora_id', franqueadoraId)

    if (deleteError) {
      console.error('[LEADS DELETE] Erro ao deletar lead:', deleteError)
      return res.status(500).json({ error: 'Erro ao deletar lead' })
    }

    return res.json({ message: 'Lead deletado com sucesso' })
  })
)

router.put('/leads/:id', requireAuth, requireRole(['SUPER_ADMIN']), requireFranqueadoraAdmin, async (req, res) => {
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
router.get('/academies/:id/stats', requireAuth, requireRole(['SUPER_ADMIN']), requireFranqueadoraAdmin, asyncErrorHandler(async (req, res) => {
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

    // Buscar a unit vinculada à academy (via academy_legacy_id)
    const { data: linkedUnit } = await supabase
      .from('units')
      .select('id')
      .eq('academy_legacy_id', id)
      .eq('is_active', true)
      .maybeSingle()

    const linkedUnitId = linkedUnit?.id

    // Buscar IDs dos professores da academia para buscar bookings
    const { data: academyTeachers } = await supabase
      .from('academy_teachers')
      .select('teacher_id')
      .eq('academy_id', id)

    const teacherIds = (academyTeachers || []).map(t => t.teacher_id).filter(Boolean)

    // Consultas paralelas para melhor performance
    const [
      teachersResult,
      studentsResult,
      bookingsByAcademyId,
      bookingsByFranchiseId,
      bookingsByUnitId,
      bookingsByLinkedUnitId,
      bookingsByTeachers
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

      // Bookings por academy_id
      supabase
        .from('bookings')
        .select('id, status_canonical')
        .eq('academy_id', id),

      // Bookings por franchise_id
      supabase
        .from('bookings')
        .select('id, status_canonical')
        .eq('franchise_id', id),

      // Bookings por unit_id (usando o ID da academy diretamente)
      supabase
        .from('bookings')
        .select('id, status_canonical')
        .eq('unit_id', id),

      // Bookings por unit_id vinculada (via academy_legacy_id)
      linkedUnitId
        ? supabase
          .from('bookings')
          .select('id, status_canonical')
          .eq('unit_id', linkedUnitId)
        : Promise.resolve({ data: [], error: null, count: 0 }),

      // Bookings por professores (se houver professores)
      teacherIds.length > 0
        ? supabase
          .from('bookings')
          .select('id, status_canonical')
          .in('teacher_id', teacherIds)
        : Promise.resolve({ data: [], error: null, count: 0 })
    ])

    // Combinar todos os bookings únicos (usando Set para evitar duplicatas)
    const allBookingsIds = new Set<string>()
    const allBookings: Array<{ id: string; status_canonical: string }> = []

    const addBookings = (bookings: any[]) => {
      if (Array.isArray(bookings)) {
        bookings.forEach(b => {
          if (b?.id && !allBookingsIds.has(b.id)) {
            allBookingsIds.add(b.id)
            allBookings.push(b)
          }
        })
      }
    }

    addBookings(bookingsByAcademyId.data || [])
    addBookings(bookingsByFranchiseId.data || [])
    addBookings(bookingsByUnitId.data || [])
    if (linkedUnitId) {
      addBookings(bookingsByLinkedUnitId.data || [])
    }
    if (teacherIds.length > 0) {
      addBookings(bookingsByTeachers.data || [])
    }

    const totalBookings = allBookings.length
    const completedBookings = allBookings.filter(b => b.status_canonical === 'DONE').length
    const cancelledBookings = allBookings.filter(b => b.status_canonical === 'CANCELED').length

    // Buscar créditos, planos ativos e dados adicionais
    const now = new Date()
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString()
    const today = now.toISOString().split('T')[0]

    const [
      creditsResult, 
      plansResult, 
      activeTeachersResult,
      checkinsResult,
      profHoursResult,
      pendingBookingsResult,
      recurringSeriesResult,
      recentNotificationsResult
    ] = await Promise.all([
      // Créditos disponíveis (soma de todos os créditos dos alunos da academia)
      supabase
        .from('academy_students')
        .select('student_id')
        .eq('academy_id', id)
        .eq('status', 'active'),
      // Planos ativos
      supabase
        .from('academy_plans')
        .select('*', { count: 'exact', head: true })
        .eq('academy_id', id)
        .eq('is_active', true),
      // Professores ativos
      supabase
        .from('academy_teachers')
        .select('*', { count: 'exact', head: true })
        .eq('academy_id', id)
        .eq('status', 'active'),
      // Check-ins do mês
      supabase
        .from('checkins')
        .select('id, created_at', { count: 'exact' })
        .eq('academy_id', id)
        .gte('created_at', firstDayOfMonth)
        .lte('created_at', lastDayOfMonth),
      // Horas disponíveis dos professores (sistema novo)
      linkedUnitId 
        ? supabase
            .from('prof_hour_balance')
            .select('available_hours, locked_hours')
            .or(`unit_id.eq.${linkedUnitId},unit_id.is.null`)
            .eq('franqueadora_id', req.franqueadoraAdmin.franqueadora_id)
        : Promise.resolve({ data: [], error: null }),
      // Agendamentos pendentes (próximos 7 dias)
      supabase
        .from('bookings')
        .select('id', { count: 'exact', head: true })
        .or(`academy_id.eq.${id},franchise_id.eq.${id}${linkedUnitId ? `,unit_id.eq.${linkedUnitId}` : ''}`)
        .eq('status_canonical', 'SCHEDULED')
        .gte('date', today),
      // Séries de agendamentos recorrentes ativas
      supabase
        .from('booking_series')
        .select('id', { count: 'exact', head: true })
        .eq('academy_id', id)
        .eq('is_active', true),
      // Notificações recentes (últimos 7 dias)
      supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('academy_id', id)
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
    ])

    // Buscar créditos dos alunos de múltiplas fontes
    const activeStudentIds = (creditsResult.data || []).map(s => s.student_id).filter(Boolean)
    let creditsBalance = 0
    
    // 1. Buscar da tabela student_class_balance (sistema novo)
    const { data: classBalances } = await supabase
      .from('student_class_balance')
      .select('total_purchased, total_consumed, locked_qty')
      .or(linkedUnitId 
        ? `unit_id.eq.${id},unit_id.eq.${linkedUnitId},unit_id.is.null`
        : `unit_id.eq.${id},unit_id.is.null`)
      .eq('franqueadora_id', req.franqueadoraAdmin.franqueadora_id)

    const balanceFromNewSystem = (classBalances || []).reduce((sum, b) => {
      const available = (b.total_purchased || 0) - (b.total_consumed || 0) - (b.locked_qty || 0)
      return sum + Math.max(0, available)
    }, 0)

    // 2. Buscar da tabela users.credits (sistema legado) se não houver dados no novo
    if (balanceFromNewSystem === 0 && activeStudentIds.length > 0) {
      const { data: studentCredits } = await supabase
        .from('users')
        .select('credits')
        .in('id', activeStudentIds)

      creditsBalance = (studentCredits || []).reduce((sum, u) => sum + (u.credits || 0), 0)
    } else {
      creditsBalance = balanceFromNewSystem
    }

    console.log(`[ACADEMY STATS] Academy ${id}:`, {
      totalBookings,
      completedBookings,
      cancelledBookings,
      bookingsByAcademyId: bookingsByAcademyId.data?.length || 0,
      bookingsByFranchiseId: bookingsByFranchiseId.data?.length || 0,
      bookingsByUnitId: bookingsByUnitId.data?.length || 0,
      bookingsByLinkedUnitId: linkedUnitId ? bookingsByLinkedUnitId.data?.length || 0 : 0,
      bookingsByTeachers: teacherIds.length > 0 ? bookingsByTeachers.data?.length || 0 : 0,
      teacherIds: teacherIds.length,
      linkedUnitId,
      creditsBalance,
      balanceFromNewSystem,
      plansActive: plansResult.count || 0
    })

    // Processar resultados
    const totalTeachers = teachersResult.count || 0
    const allStudents = studentsResult.data || []
    const totalStudents = allStudents.length
    const activeStudents = allStudents.filter(s => s.status === 'active').length
    const activeTeachers = activeTeachersResult.count || totalTeachers

    // Calcular horas dos professores
    const profHoursData = profHoursResult.data || []
    const totalProfHours = profHoursData.reduce((sum, h) => sum + (h.available_hours || 0), 0)
    const lockedProfHours = profHoursData.reduce((sum, h) => sum + (h.locked_hours || 0), 0)

    // Check-ins do mês
    const monthlyCheckins = checkinsResult.count || 0

    const finalStats = {
      academy: {
        id: academy.id,
        name: academy.name,
        monthlyRevenue: academy.monthly_revenue || 0
      },
      // Usuários
      totalStudents,
      activeStudents,
      totalTeachers,
      activeTeachers,
      // Agendamentos
      totalBookings,
      completedBookings,
      cancelledBookings,
      pendingBookings: pendingBookingsResult.count || 0,
      completionRate: totalBookings > 0 ? (completedBookings / totalBookings * 100).toFixed(1) : 0,
      // Financeiro
      monthlyRevenue: academy.monthly_revenue || 0,
      creditsBalance,
      plansActive: plansResult.count || 0,
      // Horas dos professores
      totalProfHours,
      lockedProfHours,
      availableProfHours: Math.max(0, totalProfHours - lockedProfHours),
      // Atividade
      monthlyCheckins,
      recurringSeriesActive: recurringSeriesResult.count || 0,
      recentNotifications: recentNotificationsResult.count || 0,
      // Metadata
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
    monthlyRevenue: stats.monthlyRevenue || academy.monthly_revenue || 0,
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

// GET /api/franqueadora/finance - Dados financeiros do Asaas (saldo, extrato, pagamentos)
router.get('/finance', requireAuth, requireRole(['SUPER_ADMIN']), requireFranqueadoraAdmin, asyncErrorHandler(async (req, res) => {
  if (!req.franqueadoraAdmin?.franqueadora_id) {
    return res.status(400).json({
      success: false,
      error: 'NO_FRANQUEADORA_CONTEXT',
      message: 'Contexto da franqueadora não encontrado'
    })
  }

  const queryParams = (req.query || {}) as Record<string, string | undefined>
  const { startDate, endDate } = queryParams

  // Cache por 5 minutos
  const cacheKey = `franqueadora_finance_${req.franqueadoraAdmin.franqueadora_id}_${startDate || 'all'}_${endDate || 'all'}`
  const cacheTime = 5 * 60 * 1000

  const cachedData = await cacheService.get(cacheKey)
  if (cachedData) {
    return res.json({
      success: true,
      data: cachedData,
      cached: true
    })
  }

  try {
    // Buscar dados em paralelo
    const [balanceResult, paymentsResult] = await Promise.all([
      asaasService.getBalance(),
      asaasService.getPaymentsSummary({
        startDate: startDate || undefined,
        endDate: endDate || undefined
      })
    ])

    // Buscar receita do mês atual do banco de dados (pagamentos confirmados)
    const now = new Date()
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]

    const { data: monthlyPayments } = await supabase
      .from('payment_intents')
      .select('amount_cents, status')
      .eq('franqueadora_id', req.franqueadoraAdmin.franqueadora_id)
      .gte('created_at', firstDayOfMonth)
      .lte('created_at', lastDayOfMonth)
      .eq('status', 'PAID')

    const monthlyRevenue = (monthlyPayments || [])
      .reduce((sum, p) => sum + ((p.amount_cents || 0) / 100), 0)

    // Buscar total de pagamentos pendentes
    const { data: pendingPayments } = await supabase
      .from('payment_intents')
      .select('amount_cents')
      .eq('franqueadora_id', req.franqueadoraAdmin.franqueadora_id)
      .eq('status', 'PENDING')

    const totalPendingFromDb = (pendingPayments || [])
      .reduce((sum, p) => sum + ((p.amount_cents || 0) / 100), 0)

    // Buscar totais all-time (todos os pagamentos)
    const { data: allTimePayments } = await supabase
      .from('payment_intents')
      .select('amount_cents, status')
      .eq('franqueadora_id', req.franqueadoraAdmin.franqueadora_id)

    const allTimePaid = (allTimePayments || [])
      .filter(p => p.status === 'PAID')
      .reduce((sum, p) => sum + ((p.amount_cents || 0) / 100), 0)

    const allTimePending = (allTimePayments || [])
      .filter(p => p.status === 'PENDING')
      .reduce((sum, p) => sum + ((p.amount_cents || 0) / 100), 0)

    const financeData = {
      // Dados do Asaas
      asaas: {
        balance: balanceResult.success ? balanceResult.data : null,
        payments: paymentsResult.success ? paymentsResult.data : null,
        connected: balanceResult.success
      },
      // Dados do banco de dados
      database: {
        monthlyRevenue,
        pendingPayments: totalPendingFromDb,
        allTimePaid,
        allTimePending,
        period: {
          start: firstDayOfMonth,
          end: lastDayOfMonth
        }
      },
      // Resumo consolidado
      summary: {
        availableBalance: balanceResult.success ? balanceResult.data?.balance || 0 : 0,
        pendingBalance: balanceResult.success ? balanceResult.data?.pendingBalance || 0 : totalPendingFromDb || allTimePending,
        monthlyRevenue: paymentsResult.success ? paymentsResult.data?.totalReceived || monthlyRevenue : monthlyRevenue || allTimePaid,
        overduePayments: paymentsResult.success ? paymentsResult.data?.totalOverdue || 0 : 0,
        totalReceived: allTimePaid,
        totalPending: allTimePending
      },
      lastUpdated: new Date().toISOString()
    }

    // Salvar em cache
    await cacheService.set(cacheKey, financeData, cacheTime)

    return res.json({
      success: true,
      data: financeData,
      cached: false
    })
  } catch (error: any) {
    console.error('[FRANQUEADORA] Erro ao buscar dados financeiros:', error)
    return res.status(500).json({
      success: false,
      error: 'FINANCE_ERROR',
      message: error.message || 'Erro ao buscar dados financeiros'
    })
  }
}))

// GET /api/franqueadora/academies/:id/finance - Dados financeiros de uma franquia específica
router.get('/academies/:id/finance', requireAuth, requireRole(['SUPER_ADMIN']), requireFranqueadoraAdmin, asyncErrorHandler(async (req, res) => {
  const { id } = req.params
  
  if (!req.franqueadoraAdmin?.franqueadora_id) {
    return res.status(400).json({
      success: false,
      error: 'NO_FRANQUEADORA_CONTEXT',
      message: 'Contexto da franqueadora não encontrado'
    })
  }

  // Verificar se a academia pertence à franqueadora
  const { data: academy, error: academyErr } = await supabase
    .from('academies')
    .select('id, name, franqueadora_id, asaas_account_id, asaas_wallet_id, monthly_revenue, franchise_fee, royalty_percentage')
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

  // Cache por 5 minutos
  const cacheKey = `academy_finance_${id}`
  const cacheTime = 5 * 60 * 1000

  const cachedData = await cacheService.get(cacheKey)
  if (cachedData) {
    return res.json({
      success: true,
      data: cachedData,
      cached: true
    })
  }

  try {
    // Buscar pagamentos da academia no banco de dados
    const now = new Date()
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]

    // Buscar a unit correspondente à academy (via academy_legacy_id)
    const { data: linkedUnit } = await supabase
      .from('units')
      .select('id')
      .eq('academy_legacy_id', id)
      .eq('is_active', true)
      .maybeSingle()

    const unitId = linkedUnit?.id

    // Buscar pagamentos específicos da academia
    // Considera: unit_id = academy.id OU unit_id = linked_unit.id OU pagamentos sem unit_id
    const { data: academyPayments } = await supabase
      .from('payment_intents')
      .select('amount_cents, status, created_at, unit_id')
      .eq('franqueadora_id', req.franqueadoraAdmin.franqueadora_id)
      .gte('created_at', firstDayOfMonth)
      .lte('created_at', lastDayOfMonth)

    // Filtrar pagamentos que pertencem a esta academia específica
    const filteredPayments = (academyPayments || []).filter(p => 
      p.unit_id === id || // ID da academy diretamente
      (unitId && p.unit_id === unitId) || // ID da unit vinculada
      p.unit_id === null // Pagamentos sem unit_id por compatibilidade
    )

    const monthlyRevenue = filteredPayments
      .filter(p => p.status === 'PAID')
      .reduce((sum, p) => sum + ((p.amount_cents || 0) / 100), 0)

    const pendingRevenue = filteredPayments
      .filter(p => p.status === 'PENDING')
      .reduce((sum, p) => sum + ((p.amount_cents || 0) / 100), 0)

    // Calcular royalty
    const royaltyAmount = monthlyRevenue * ((academy.royalty_percentage || 0) / 100)
    const netRevenue = monthlyRevenue - royaltyAmount

    const financeData = {
      academy: {
        id: academy.id,
        name: academy.name,
        asaasConnected: !!academy.asaas_account_id
      },
      revenue: {
        monthly: monthlyRevenue,
        pending: pendingRevenue,
        royalty: royaltyAmount,
        net: netRevenue,
        royaltyPercentage: academy.royalty_percentage || 0,
        franchiseFee: academy.franchise_fee || 0
      },
      period: {
        start: firstDayOfMonth,
        end: lastDayOfMonth
      },
      lastUpdated: new Date().toISOString()
    }

    // Salvar em cache
    await cacheService.set(cacheKey, financeData, cacheTime)

    return res.json({
      success: true,
      data: financeData,
      cached: false
    })
  } catch (error: any) {
    console.error('[FRANQUEADORA] Erro ao buscar dados financeiros da academia:', error)
    return res.status(500).json({
      success: false,
      error: 'FINANCE_ERROR',
      message: error.message || 'Erro ao buscar dados financeiros'
    })
  }
}))

// GET /api/franqueadora/users - Listar todos os usuários com informações detalhadas
router.get('/users',
  requireAuth,
  requireRole(['SUPER_ADMIN']),
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
          cref,
          cref_card_url,
          role,
          avatar_url,
          approval_status,
          approved_at,
          approved_by,
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

// POST /api/franqueadora/usuarios - Criar novo usuário (professor ou aluno)
router.post('/usuarios',
  requireAuth,
  requireRole(['SUPER_ADMIN']),
  requireFranqueadoraAdmin,
  auditSensitiveOperation('CREATE', 'users'),
  asyncErrorHandler(async (req, res) => {
    const franqueadoraId = req.franqueadoraAdmin?.franqueadora_id

    if (!franqueadoraId) {
      return res.status(400).json({
        success: false,
        error: 'NO_FRANQUEADORA_CONTEXT',
        message: 'Contexto da franqueadora não encontrado'
      })
    }

    const { name, email, phone, cpf, password, gender, role, cref, crefCardFile } = req.body

    // Validação de campos obrigatórios
    if (!name || !email || !phone || !cpf || !password || !gender || !role) {
      return res.status(400).json({
        success: false,
        error: 'MISSING_REQUIRED_FIELDS',
        message: 'Preencha todos os campos obrigatórios'
      })
    }

    // Validar role
    if (!['STUDENT', 'TEACHER'].includes(role)) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_ROLE',
        message: 'Role deve ser STUDENT ou TEACHER'
      })
    }

    // Validar gender
    const validGenders = ['MALE', 'FEMALE', 'NON_BINARY', 'OTHER', 'PREFER_NOT_TO_SAY']
    if (!validGenders.includes(gender)) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_GENDER',
        message: 'Gênero inválido'
      })
    }

    // Validar CPF
    const { validateCpfCnpj } = await import('../utils/validation')
    if (!validateCpfCnpj(cpf)) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_CPF',
        message: 'CPF inválido. Verifique os dígitos'
      })
    }

    // Validar email único
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single()

    if (!checkError && existingUser) {
      return res.status(400).json({
        success: false,
        error: 'EMAIL_ALREADY_EXISTS',
        message: 'Este email já está registrado no sistema'
      })
    }

    // Validar senha (mínimo 6 caracteres)
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'WEAK_PASSWORD',
        message: 'Senha deve ter no mínimo 6 caracteres'
      })
    }

    // Validar CREF se for professor
    if (role === 'TEACHER' && !cref) {
      return res.status(400).json({
        success: false,
        error: 'MISSING_CREF',
        message: 'CREF é obrigatório para professores'
      })
    }

    try {
      // Hash da senha
      const bcrypt = await import('bcryptjs')
      const passwordHash = await bcrypt.default.hash(password, 10)

      // Criar usuário com status APPROVED
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert({
          name,
          email,
          phone,
          cpf,
          password_hash: passwordHash,
          gender,
          role,
          approval_status: 'approved',
          is_active: true,
          created_by_franqueadora: true,
          franchisor_id: franqueadoraId
        })
        .select()
        .single()

      if (createError) {
        console.error('Erro ao criar usuário:', createError)
        return res.status(500).json({
          success: false,
          error: 'USER_CREATION_FAILED',
          message: 'Erro ao criar usuário'
        })
      }

      // Se for professor, criar perfil de professor e salvar CREF
      if (role === 'TEACHER' && newUser) {
        const { error: profileError } = await supabase
          .from('teacher_profiles')
          .insert({
            user_id: newUser.id,
            cref: cref,
            is_available: true
          })

        if (profileError) {
          console.error('Erro ao criar perfil de professor:', profileError)
          // Não falhar a criação do usuário se o perfil falhar
        }

        // Atualizar CREF no usuário
        await supabase
          .from('users')
          .update({ cref: cref })
          .eq('id', newUser.id)
      }

      // Registrar na tabela franqueadora_contacts
      const { error: contactError } = await supabase
        .from('franqueadora_contacts')
        .insert({
          franqueadora_id: franqueadoraId,
          user_id: newUser.id,
          role: role,
          status: 'ASSIGNED',
          origin: 'FRANQUEADORA_CREATED'
        })

      if (contactError) {
        console.error('Erro ao registrar contato da franqueadora:', contactError)
        // Não falhar a criação do usuário se o contato falhar
      }

      // Enviar email de boas-vindas - usando EmailUnifiedService para registrar no histórico
      let emailSent = false
      let emailError = null
      
      try {
        const { getWelcomeStudentCreatedEmail, getWelcomeTeacherCreatedEmail } = await import('../services/email-templates')
        const { emailUnifiedService } = await import('../services/email-unified.service')

        console.log('[FRANQUEADORA] Tentando enviar email de boas-vindas para:', email)

        const loginUrl = role === 'TEACHER' 
          ? 'https://meupersonalfranquia.com.br/professor/login'
          : 'https://meupersonalfranquia.com.br/aluno/login'

        // Usar template apropriado baseado no role
        const htmlEmail = role === 'TEACHER'
          ? await getWelcomeTeacherCreatedEmail(name, email, password, loginUrl)
          : await getWelcomeStudentCreatedEmail(name, email, password, loginUrl)

        const templateSlug = role === 'TEACHER' ? 'welcome-teacher-created' : 'welcome-student-created'

        const result = await emailUnifiedService.sendEmail({
          to: email,
          toName: name,
          subject: 'Bem-vindo ao Meu Personal! 🎉',
          html: htmlEmail,
          text: `Bem-vindo ao Meu Personal! Suas credenciais de acesso: Email: ${email}, Senha temporária: ${password}. Por segurança, recomendamos que você altere sua senha no primeiro acesso. Acesse: ${loginUrl}`,
          templateSlug,
          recipientId: newUser.id,
          franqueadoraId: franqueadoraId,
          triggeredBy: 'franqueadora-create-user'
        })
        
        emailSent = result.success
        console.log('[FRANQUEADORA] Email de boas-vindas enviado com sucesso para:', email, '- LogId:', result.logId)
      } catch (err: any) {
        emailError = err.message || 'Erro desconhecido'
        console.error('[FRANQUEADORA] Erro ao enviar email de boas-vindas:', err)
        // Não falhar a criação do usuário se o email falhar
      }

      return res.status(201).json({
        success: true,
        message: emailSent 
          ? `${role === 'TEACHER' ? 'Professor' : 'Aluno'} criado com sucesso. Email enviado para ${email}`
          : `${role === 'TEACHER' ? 'Professor' : 'Aluno'} criado com sucesso. Não foi possível enviar o email.`,
        emailSent,
        emailError,
        temporaryPassword: !emailSent ? password : undefined,
        user: {
          id: newUser.id,
          name: newUser.name,
          email: newUser.email,
          role: newUser.role,
          status: newUser.approval_status
        }
      })
    } catch (error: any) {
      console.error('Erro ao criar usuário:', error)
      return res.status(500).json({
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'Erro interno ao criar usuário'
      })
    }
  })
)

export default router

