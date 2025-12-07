// Client-side version of email template for preview
// Use local path for development preview
const LOGO_URL = '/images/logo.png'
const PRIMARY_COLOR = '#002C4E'

export const getHtmlEmailTemplate = (
  title: string,
  content: string,
  buttonUrl?: string,
  buttonText?: string
) => {
  return `
<!DOCTYPE html>
<html>
<head>
  <style>
    @media only screen and (max-width: 600px) {
      .container { width: 100% !important; }
      .content { padding: 20px !important; }
    }
  </style>
</head>
<body style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f3f4f6; margin: 0; padding: 0; -webkit-font-smoothing: antialiased;">
  <div style="width: 100%; background-color: #f3f4f6; padding: 40px 0;">
    <div class="container" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
      
      <!-- Header -->
      <div style="background-color: ${PRIMARY_COLOR}; padding: 15px 29px; text-align: center; overflow: hidden;">
        <img id="1765109664553154100_imgsrc_url_0" alt="Meu Personal" style="height: 40px; width: auto; max-width: 200px;" src="${LOGO_URL}" />
      </div>

      <!-- Content -->
      <div class="content" style="padding: 40px; color: #374151; line-height: 1.6;">
        <!-- Title -->
        <h1 style="color: ${PRIMARY_COLOR}; margin-top: 0; font-size: 24px; text-align: center; margin-bottom: 24px;">${title}</h1>
        
        <!-- Body -->
        <div style="font-size: 16px;">
          ${content}
        </div>
        
        <!-- Action Button -->
        ${
          buttonUrl
            ? `
          <div style="text-align: center; margin-top: 32px; margin-bottom: 16px;">
            <a href="${buttonUrl}" target="_blank" style="display: inline-block; background-color: ${PRIMARY_COLOR}; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: bold; font-size: 16px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              ${buttonText || 'Acessar Plataforma'}
            </a>
          </div>
        `
            : ''
        }

        <p style="text-align: center; font-size: 14px; color: #9ca3af; margin-top: 30px;">
          Se o botão não funcionar, copie e cole o link abaixo no seu navegador:<br>
          <a href="${buttonUrl}" target="_blank" style="color: ${PRIMARY_COLOR}; word-break: break-all;">${buttonUrl}</a>
        </p>
      </div>

      <!-- Footer -->
      <div style="background-color: #f9fafb; padding: 24px; text-align: center; font-size: 12px; color: #6b7280; border-top: 1px solid #e5e7eb;">
        <p style="margin: 0 font-weight: 600;">Meu Personal</p>
        <p style="margin: 5px 0;">&copy; ${new Date().getFullYear()} Todos os direitos reservados.</p>
        <p style="margin: 10px 0 0 0;">Este é um e-mail automático, por favor não responda.</p>
      </div>
    </div>
  </div>
</body>
</html>
`
}
