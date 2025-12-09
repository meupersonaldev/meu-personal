import nodemailer from 'nodemailer'


interface EmailParams {
  to: string
  subject: string
  html: string
  text: string
}

export const emailService = {
  async sendEmail({ to, subject, html, text }: EmailParams) {
    const smtpHost = process.env.SMTP_HOST
    const smtpPort = process.env.SMTP_PORT
    const smtpUser = process.env.SMTP_USER
    const smtpPass = process.env.SMTP_PASS

    console.log('[EMAIL SERVICE] Configuração SMTP:', {
      host: smtpHost ? 'configurado' : 'NÃO CONFIGURADO',
      port: smtpPort ? 'configurado' : 'NÃO CONFIGURADO',
      user: smtpUser ? 'configurado' : 'NÃO CONFIGURADO',
      pass: smtpPass ? 'configurado' : 'NÃO CONFIGURADO'
    })

    if (!smtpHost || !smtpPort || !smtpUser || !smtpPass) {
      console.warn('[EMAIL SERVICE] Credenciais SMTP não configuradas. Email não será enviado.')
      console.warn('[EMAIL SERVICE] Configure as variáveis: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS')
      
      if (process.env.NODE_ENV !== 'production') {
        console.log('--- EMAIL SIMULADO ---')
        console.log(`Para: ${to}`)
        console.log(`Assunto: ${subject}`)
        console.log('--- CORPO HTML ---')
        console.log(html)
        console.log('--- CORPO TEXTO ---')
        console.log(text)
        console.log('------------------')
      }
      
      // Lançar erro para que o chamador saiba que o email não foi enviado
      throw new Error('Credenciais SMTP não configuradas')
    }

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: parseInt(smtpPort, 10),
      secure: parseInt(smtpPort, 10) === 465, // true for 465, false for other ports
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
      tls: {
        // Aceitar certificados auto-assinados (comum em servidores SMTP locais ou de hospedagem)
        rejectUnauthorized: false
      }
    })

    try {
      console.log('[EMAIL SERVICE] Enviando email para:', to)
      const info = await transporter.sendMail({
        from: `"Meu Personal" <${smtpUser}>`,
        to,
        subject,
        html,
        text,
      })
      console.log('[EMAIL SERVICE] Email enviado com sucesso! ID:', info.messageId)
      return info
    } catch (error: any) {
      console.error('[EMAIL SERVICE] Erro ao enviar email:', error.message)
      throw new Error(`Falha ao enviar email: ${error.message}`)
    }
  },
}
