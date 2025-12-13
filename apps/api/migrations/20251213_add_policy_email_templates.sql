-- Templates de email para notificações de políticas

INSERT INTO email_templates (slug, name, subject, html_content, text_content, variables, is_active, created_at, updated_at)
VALUES 
(
  'policy-published',
  'Nova Política Publicada',
  'Nova Política de Operação - Versão {{version}}',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #002C4E; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }
    .changes { background: white; padding: 15px; border-radius: 8px; margin: 15px 0; }
    .change-item { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
    .change-label { color: #666; }
    .change-values { text-align: right; }
    .old-value { color: #999; text-decoration: line-through; margin-right: 8px; }
    .new-value { color: #002C4E; font-weight: bold; }
    .btn { display: inline-block; background: #002C4E; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 15px; }
    .footer { text-align: center; color: #999; font-size: 12px; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Nova Política de Operação</h1>
      <p>Versão {{version}} - Vigente a partir de {{effectiveFrom}}</p>
    </div>
    <div class="content">
      <p>Olá <strong>{{academyName}}</strong>,</p>
      <p>A <strong>{{franqueadoraName}}</strong> publicou uma nova versão das políticas de operação.</p>
      
      {{#if hasChanges}}
      <div class="changes">
        <h3>Alterações:</h3>
        {{#each changedFields}}
        <div class="change-item">
          <span class="change-label">{{this.label}}</span>
          <span class="change-values">
            <span class="old-value">{{this.oldValue}}</span>
            <span class="new-value">{{this.newValue}}</span>
          </span>
        </div>
        {{/each}}
      </div>
      {{else}}
      <p>Esta é a primeira versão publicada das políticas.</p>
      {{/if}}
      
      <p>Acesse o dashboard para ver todos os detalhes:</p>
      <a href="{{dashboardUrl}}" class="btn">Acessar Dashboard</a>
    </div>
    <div class="footer">
      <p>Este é um email automático do sistema Meu Personal.</p>
    </div>
  </div>
</body>
</html>',
  'Nova Política de Operação - Versão {{version}}

Olá {{academyName}},

A {{franqueadoraName}} publicou uma nova versão das políticas de operação.
Vigente a partir de: {{effectiveFrom}}

Acesse o dashboard para ver todos os detalhes: {{dashboardUrl}}

Este é um email automático do sistema Meu Personal.',
  '["academyName", "franqueadoraName", "version", "effectiveFrom", "changedFields", "hasChanges", "dashboardUrl"]',
  true,
  NOW(),
  NOW()
),
(
  'policy-rollback',
  'Rollback de Política',
  'Política Revertida - Versão {{newVersion}}',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #F59E0B; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }
    .info-box { background: white; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #F59E0B; }
    .btn { display: inline-block; background: #002C4E; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 15px; }
    .footer { text-align: center; color: #999; font-size: 12px; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>⚠️ Política Revertida</h1>
      <p>Versão {{newVersion}}</p>
    </div>
    <div class="content">
      <p>Olá <strong>{{academyName}}</strong>,</p>
      <p>A <strong>{{franqueadoraName}}</strong> reverteu as políticas de operação para uma versão anterior.</p>
      
      <div class="info-box">
        <p><strong>Revertido para:</strong> Versão {{rolledBackTo}}</p>
        {{#if comment}}
        <p><strong>Motivo:</strong> {{comment}}</p>
        {{/if}}
      </div>
      
      <p>Acesse o dashboard para ver todos os detalhes:</p>
      <a href="{{dashboardUrl}}" class="btn">Acessar Dashboard</a>
    </div>
    <div class="footer">
      <p>Este é um email automático do sistema Meu Personal.</p>
    </div>
  </div>
</body>
</html>',
  'Política Revertida - Versão {{newVersion}}

Olá {{academyName}},

A {{franqueadoraName}} reverteu as políticas de operação para a versão {{rolledBackTo}}.

{{#if comment}}
Motivo: {{comment}}
{{/if}}

Acesse o dashboard para ver todos os detalhes: {{dashboardUrl}}

Este é um email automático do sistema Meu Personal.',
  '["academyName", "franqueadoraName", "newVersion", "rolledBackTo", "comment", "dashboardUrl"]',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  subject = EXCLUDED.subject,
  html_content = EXCLUDED.html_content,
  text_content = EXCLUDED.text_content,
  variables = EXCLUDED.variables,
  updated_at = NOW();
