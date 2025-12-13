-- Templates de email para notificações de políticas
-- Estrutura adaptada para tabela email_templates existente

INSERT INTO email_templates (slug, title, content, button_text, button_url, variables, created_at, updated_at)
VALUES 
(
  'policy-published',
  'Nova Política de Operação - Versão {{version}}',
  '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <div style="background: #002C4E; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="margin: 0;">Nova Política de Operação</h1>
    <p style="margin: 10px 0 0;">Versão {{version}} - Vigente a partir de {{effectiveFrom}}</p>
  </div>
  <div style="background: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px;">
    <p>Olá <strong>{{academyName}}</strong>,</p>
    <p>A <strong>{{franqueadoraName}}</strong> publicou uma nova versão das políticas de operação.</p>
    
    {{#if hasChanges}}
    <div style="background: white; padding: 15px; border-radius: 8px; margin: 15px 0;">
      <h3 style="margin-top: 0;">Alterações:</h3>
      {{#each changedFields}}
      <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee;">
        <span style="color: #666;">{{this.label}}</span>
        <span>
          <span style="color: #999; text-decoration: line-through; margin-right: 8px;">{{this.oldValue}}</span>
          <span style="color: #002C4E; font-weight: bold;">{{this.newValue}}</span>
        </span>
      </div>
      {{/each}}
    </div>
    {{else}}
    <p>Esta é a primeira versão publicada das políticas.</p>
    {{/if}}
    
    <p>Acesse o dashboard para ver todos os detalhes.</p>
  </div>
  <p style="text-align: center; color: #999; font-size: 12px; margin-top: 20px;">Este é um email automático do sistema Meu Personal.</p>
</div>',
  'Acessar Dashboard',
  '{{dashboardUrl}}',
  '["academyName", "franqueadoraName", "version", "effectiveFrom", "changedFields", "hasChanges", "dashboardUrl"]',
  NOW(),
  NOW()
),
(
  'policy-rollback',
  'Política Revertida - Versão {{newVersion}}',
  '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <div style="background: #F59E0B; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="margin: 0;">⚠️ Política Revertida</h1>
    <p style="margin: 10px 0 0;">Versão {{newVersion}}</p>
  </div>
  <div style="background: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px;">
    <p>Olá <strong>{{academyName}}</strong>,</p>
    <p>A <strong>{{franqueadoraName}}</strong> reverteu as políticas de operação para uma versão anterior.</p>
    
    <div style="background: white; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #F59E0B;">
      <p style="margin: 0;"><strong>Revertido para:</strong> Versão {{rolledBackTo}}</p>
      {{#if comment}}
      <p style="margin: 10px 0 0;"><strong>Motivo:</strong> {{comment}}</p>
      {{/if}}
    </div>
    
    <p>Acesse o dashboard para ver todos os detalhes.</p>
  </div>
  <p style="text-align: center; color: #999; font-size: 12px; margin-top: 20px;">Este é um email automático do sistema Meu Personal.</p>
</div>',
  'Acessar Dashboard',
  '{{dashboardUrl}}',
  '["academyName", "franqueadoraName", "newVersion", "rolledBackTo", "comment", "dashboardUrl"]',
  NOW(),
  NOW()
)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  content = EXCLUDED.content,
  button_text = EXCLUDED.button_text,
  button_url = EXCLUDED.button_url,
  variables = EXCLUDED.variables,
  updated_at = NOW();
