import express from 'express'
import { z } from 'zod'
import { asaasService } from '../services/asaas.service'
import { requireAuth } from '../middleware/auth'

const router = express.Router()

// Schema para criação de subconta
const createAccountSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  email: z.string().email('Email inválido'),
  cpfCnpj: z.string().min(1, 'CPF/CNPJ é obrigatório'),
  mobilePhone: z.string().min(1, 'Telefone móvel é obrigatório'),
  incomeValue: z.number().positive('Receita mensal é obrigatória e deve ser maior que zero'),
  address: z.string().min(1, 'Endereço é obrigatório'),
  addressNumber: z.string().min(1, 'Número do endereço é obrigatório'),
  province: z.string().min(1, 'Bairro é obrigatório'),
  postalCode: z.string().min(1, 'CEP é obrigatório'),
  loginEmail: z.string().email('Login email inválido').optional(),
  birthDate: z.string().optional(),
  companyType: z.string().optional(),
  phone: z.string().optional(),
  site: z.string().url('URL inválida').optional(),
  complement: z.string().optional(),
  webhooks: z.array(z.object({
    name: z.string(),
    url: z.string().url('URL do webhook inválida'),
    email: z.string().email('Email do webhook inválido').optional(),
    enabled: z.boolean().optional(),
    interrupted: z.boolean().optional(),
    apiVersion: z.number().optional(),
    authToken: z.string().optional(),
    sendType: z.enum(['SEQUENTIALLY', 'PARALLEL']).optional(),
    events: z.array(z.string()).optional()
  })).optional()
})

/**
 * POST /api/asaas/accounts
 * Criar subconta no Asaas
 * 
 * Permite criar uma subconta para receber pagamentos de forma independente
 */
router.post('/accounts', requireAuth, async (req, res) => {
  try {
    const parsed = createAccountSchema.parse(req.body)
    
    // Type assertion: o Zod schema garante que os campos obrigatórios estão presentes
    const data = {
      name: parsed.name,
      email: parsed.email,
      cpfCnpj: parsed.cpfCnpj,
      mobilePhone: parsed.mobilePhone,
      incomeValue: parsed.incomeValue,
      address: parsed.address,
      addressNumber: parsed.addressNumber,
      province: parsed.province,
      postalCode: parsed.postalCode,
      ...(parsed.loginEmail && { loginEmail: parsed.loginEmail }),
      ...(parsed.birthDate && { birthDate: parsed.birthDate }),
      ...(parsed.companyType && { companyType: parsed.companyType }),
      ...(parsed.phone && { phone: parsed.phone }),
      ...(parsed.site && { site: parsed.site }),
      ...(parsed.complement && { complement: parsed.complement }),
      ...(parsed.webhooks && { webhooks: parsed.webhooks })
    } as {
      name: string
      email: string
      cpfCnpj: string
      mobilePhone: string
      incomeValue: number
      address: string
      addressNumber: string
      province: string
      postalCode: string
      loginEmail?: string
      birthDate?: string
      companyType?: string
      phone?: string
      site?: string
      complement?: string
      webhooks?: Array<{
        name: string
        url: string
        email?: string
        enabled?: boolean
        interrupted?: boolean
        apiVersion?: number
        authToken?: string
        sendType?: 'SEQUENTIALLY' | 'PARALLEL'
        events?: string[]
      }>
    }

    const result = await asaasService.createAccount(data)

    if (!result.success) {
      return res.status(400).json({
        error: result.error
      })
    }

    res.status(201).json({
      message: 'Subconta criada com sucesso',
      data: result.data
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Dados inválidos',
        details: error.errors
      })
    }

    console.error('Erro ao criar subconta:', error)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

export default router

