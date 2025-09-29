import express from 'express'
import { z } from 'zod'
import { supabase } from '../config/supabase'
import { asaasService } from '../services/asaas.service'

const router = express.Router()

// Schema para compra de pacote de aluno
const studentPackagePurchaseSchema = z.object({
  student_id: z.string().uuid(),
  package_id: z.string().uuid(),
  teacher_id: z.string().uuid(), // Professor escolhido pelo aluno
  payment_method: z.enum(['PIX', 'BOLETO', 'CREDIT_CARD'])
})

// Schema para compra de horas de professor
const teacherHoursPurchaseSchema = z.object({
  teacher_id: z.string().uuid(),
  hours_package_id: z.string().uuid(),
  payment_method: z.enum(['PIX', 'BOLETO', 'CREDIT_CARD'])
})

/**
 * POST /api/payments/student/purchase-package
 * Aluno compra pacote (espaço + personal)
 * 
 * Fluxo:
 * 1. Aluno paga → Dinheiro vai 100% para franquia
 * 2. Professor escolhido GANHA horas de brinde
 * 3. Aluno ganha créditos para usar
 */
router.post('/student/purchase-package', async (req, res) => {
  try {
    const data = studentPackagePurchaseSchema.parse(req.body)

    // 1. Buscar dados do aluno
    const { data: student, error: studentError } = await supabase
      .from('users')
      .select('*, academy_students(academy_id)')
      .eq('id', data.student_id)
      .single()

    if (studentError || !student) {
      return res.status(404).json({ error: 'Aluno não encontrado' })
    }

    // 2. Buscar pacote
    const { data: package_, error: packageError } = await supabase
      .from('student_plans')
      .select('*')
      .eq('id', data.package_id)
      .single()

    if (packageError || !package_) {
      return res.status(404).json({ error: 'Pacote não encontrado' })
    }

    // 3. Buscar professor escolhido
    const { data: teacher, error: teacherError } = await supabase
      .from('users')
      .select('*')
      .eq('id', data.teacher_id)
      .eq('role', 'TEACHER')
      .single()

    if (teacherError || !teacher) {
      return res.status(404).json({ error: 'Professor não encontrado' })
    }

    // 4. Criar/buscar cliente no Asaas
    let asaasCustomerId = student.asaas_customer_id

    if (!asaasCustomerId) {
      const customerResult = await asaasService.createCustomer({
        name: student.name,
        email: student.email,
        cpfCnpj: student.cpf || '00000000000', // TODO: Adicionar CPF no cadastro
        phone: student.phone
      })

      if (!customerResult.success) {
        return res.status(500).json({ error: 'Erro ao criar cliente no Asaas' })
      }

      asaasCustomerId = customerResult.data.id

      // Salvar ID do Asaas no banco
      await supabase
        .from('users')
        .update({ asaas_customer_id: asaasCustomerId })
        .eq('id', student.id)
    }

    // 5. Criar cobrança no Asaas
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const dueDate = tomorrow.toISOString().split('T')[0]

    const paymentResult = await asaasService.createPayment({
      customer: asaasCustomerId,
      billingType: data.payment_method,
      value: package_.price,
      dueDate: dueDate,
      description: `${package_.name} - ${package_.credits_included} créditos`,
      externalReference: `STUDENT_PACKAGE_${data.student_id}_${data.package_id}_${Date.now()}`
    })

    if (!paymentResult.success) {
      return res.status(500).json({ error: 'Erro ao criar cobrança no Asaas' })
    }

    // 6. Salvar transação no banco (status: PENDING)
    const { data: transaction, error: transactionError } = await supabase
      .from('transactions')
      .insert({
        user_id: student.id,
        type: 'CREDIT_PURCHASE',
        amount: package_.price,
        description: `Compra de pacote: ${package_.name}`,
        reference_id: paymentResult.data.id,
        metadata: {
          package_id: package_.id,
          teacher_id: teacher.id,
          credits_to_add: package_.credits_included,
          hours_to_gift_teacher: 1, // Professor ganha 1h de brinde
          asaas_payment_id: paymentResult.data.id,
          payment_method: data.payment_method
        }
      })
      .select()
      .single()

    if (transactionError) {
      console.error('Erro ao salvar transação:', transactionError)
      return res.status(500).json({ error: 'Erro ao salvar transação' })
    }

    // 7. Retornar dados do pagamento
    res.status(201).json({
      message: 'Pagamento criado com sucesso',
      transaction_id: transaction.id,
      payment: {
        id: paymentResult.data.id,
        status: paymentResult.data.status,
        value: paymentResult.data.value,
        due_date: paymentResult.data.dueDate,
        // Links de pagamento
        invoice_url: paymentResult.data.invoiceUrl, // Boleto
        bank_slip_url: paymentResult.data.bankSlipUrl, // Boleto PDF
        pix_qr_code: paymentResult.data.encodedImage, // QR Code PIX
        pix_copy_paste: paymentResult.data.payload // Código PIX copia e cola
      }
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Dados inválidos',
        details: error.errors
      })
    }

    console.error('Erro ao processar compra:', error)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

/**
 * POST /api/payments/teacher/purchase-hours
 * Professor compra horas
 * 
 * Fluxo:
 * 1. Professor paga → Dinheiro vai 100% para franquia
 * 2. Professor recebe horas no banco de horas dele
 */
router.post('/teacher/purchase-hours', async (req, res) => {
  try {
    const data = teacherHoursPurchaseSchema.parse(req.body)

    // 1. Buscar dados do professor
    const { data: teacher, error: teacherError } = await supabase
      .from('users')
      .select('*')
      .eq('id', data.teacher_id)
      .eq('role', 'TEACHER')
      .single()

    if (teacherError || !teacher) {
      return res.status(404).json({ error: 'Professor não encontrado' })
    }

    // 2. Buscar pacote de horas
    const { data: hoursPackage, error: packageError } = await supabase
      .from('teacher_plans')
      .select('*')
      .eq('id', data.hours_package_id)
      .single()

    if (packageError || !hoursPackage) {
      return res.status(404).json({ error: 'Pacote de horas não encontrado' })
    }

    // 3. Criar/buscar cliente no Asaas
    let asaasCustomerId = teacher.asaas_customer_id

    if (!asaasCustomerId) {
      const customerResult = await asaasService.createCustomer({
        name: teacher.name,
        email: teacher.email,
        cpfCnpj: teacher.cpf || '00000000000',
        phone: teacher.phone
      })

      if (!customerResult.success) {
        return res.status(500).json({ error: 'Erro ao criar cliente no Asaas' })
      }

      asaasCustomerId = customerResult.data.id

      await supabase
        .from('users')
        .update({ asaas_customer_id: asaasCustomerId })
        .eq('id', teacher.id)
    }

    // 4. Criar cobrança no Asaas
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const dueDate = tomorrow.toISOString().split('T')[0]

    const paymentResult = await asaasService.createPayment({
      customer: asaasCustomerId,
      billingType: data.payment_method,
      value: hoursPackage.price,
      dueDate: dueDate,
      description: `${hoursPackage.name} - Banco de Horas`,
      externalReference: `TEACHER_HOURS_${data.teacher_id}_${data.hours_package_id}_${Date.now()}`
    })

    if (!paymentResult.success) {
      return res.status(500).json({ error: 'Erro ao criar cobrança no Asaas' })
    }

    // 5. Salvar transação no banco
    const { data: transaction, error: transactionError } = await supabase
      .from('transactions')
      .insert({
        user_id: teacher.id,
        type: 'CREDIT_PURCHASE',
        amount: hoursPackage.price,
        description: `Compra de horas: ${hoursPackage.name}`,
        reference_id: paymentResult.data.id,
        metadata: {
          package_id: hoursPackage.id,
          hours_to_add: hoursPackage.hours_included || 10, // TODO: Adicionar campo hours_included
          asaas_payment_id: paymentResult.data.id,
          payment_method: data.payment_method
        }
      })
      .select()
      .single()

    if (transactionError) {
      console.error('Erro ao salvar transação:', transactionError)
      return res.status(500).json({ error: 'Erro ao salvar transação' })
    }

    // 6. Retornar dados do pagamento
    res.status(201).json({
      message: 'Pagamento criado com sucesso',
      transaction_id: transaction.id,
      payment: {
        id: paymentResult.data.id,
        status: paymentResult.data.status,
        value: paymentResult.data.value,
        due_date: paymentResult.data.dueDate,
        invoice_url: paymentResult.data.invoiceUrl,
        bank_slip_url: paymentResult.data.bankSlipUrl,
        pix_qr_code: paymentResult.data.encodedImage,
        pix_copy_paste: paymentResult.data.payload
      }
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Dados inválidos',
        details: error.errors
      })
    }

    console.error('Erro ao processar compra:', error)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

/**
 * POST /api/payments/webhook/asaas
 * Webhook do Asaas para processar confirmações de pagamento
 * 
 * Quando pagamento é confirmado:
 * - ALUNO: Adiciona créditos + Dá horas de brinde pro professor
 * - PROFESSOR: Adiciona horas no banco de horas
 */
router.post('/webhook/asaas', async (req, res) => {
  try {
    const event = req.body

    console.log('Webhook Asaas recebido:', event.event, event.payment?.id)

    // Processar apenas quando pagamento for recebido
    if (event.event === 'PAYMENT_RECEIVED' || event.event === 'PAYMENT_CONFIRMED') {
      const paymentId = event.payment.id
      const externalReference = event.payment.externalReference

      // Buscar transação no banco
      const { data: transaction, error: transactionError } = await supabase
        .from('transactions')
        .select('*')
        .eq('reference_id', paymentId)
        .single()

      if (transactionError || !transaction) {
        console.error('Transação não encontrada:', paymentId)
        return res.sendStatus(200) // Retorna 200 para não reprocessar
      }

      // Verificar se já foi processado
      if (transaction.status === 'COMPLETED') {
        console.log('Transação já processada:', transaction.id)
        return res.sendStatus(200)
      }

      const metadata = transaction.metadata as any

      // COMPRA DE PACOTE DE ALUNO
      if (externalReference?.startsWith('STUDENT_PACKAGE_')) {
        // 1. Adicionar créditos para o aluno
        await supabase.rpc('add_credits', {
          user_id: transaction.user_id,
          credits_amount: metadata.credits_to_add
        })

        // 2. DAR HORAS DE BRINDE PARA O PROFESSOR
        await supabase.rpc('add_teacher_hours', {
          teacher_id: metadata.teacher_id,
          hours_amount: metadata.hours_to_gift_teacher
        })

        // 3. Criar notificação para o professor
        await supabase
          .from('notifications')
          .insert({
            user_id: metadata.teacher_id,
            type: 'HOURS_GIFTED',
            title: 'Você ganhou horas!',
            message: `Parabéns! Você ganhou ${metadata.hours_to_gift_teacher}h de brinde por ter sido escolhido por um novo aluno.`,
            data: {
              student_id: transaction.user_id,
              hours_gifted: metadata.hours_to_gift_teacher
            }
          })

        console.log(`✅ Aluno ${transaction.user_id} recebeu ${metadata.credits_to_add} créditos`)
        console.log(`🎁 Professor ${metadata.teacher_id} ganhou ${metadata.hours_to_gift_teacher}h de brinde`)
      }

      // COMPRA DE HORAS DE PROFESSOR
      if (externalReference?.startsWith('TEACHER_HOURS_')) {
        // Adicionar horas no banco de horas do professor
        await supabase.rpc('add_teacher_hours', {
          teacher_id: transaction.user_id,
          hours_amount: metadata.hours_to_add
        })

        console.log(`✅ Professor ${transaction.user_id} recebeu ${metadata.hours_to_add}h`)
      }

      // Atualizar status da transação
      await supabase
        .from('transactions')
        .update({
          status: 'COMPLETED',
          completed_at: new Date().toISOString()
        })
        .eq('id', transaction.id)
    }

    res.sendStatus(200)

  } catch (error) {
    console.error('Erro ao processar webhook:', error)
    res.sendStatus(500)
  }
})

export default router
