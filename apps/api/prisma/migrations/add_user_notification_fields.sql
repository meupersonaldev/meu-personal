-- Adicionar campos para notificações de usuários (user_id, link, actor_id, role_scope)
-- Isso permite notificações tanto para academias quanto para usuários específicos

-- Tornar academy_id nullable (notificações de usuário não precisam de academy_id)
ALTER TABLE notifications 
ALTER COLUMN academy_id DROP NOT NULL;

-- Adicionar coluna user_id (nullable - pode ser notificação de academia ou de usuário)
ALTER TABLE notifications 
ADD COLUMN IF NOT EXISTS user_id UUID;

-- Adicionar coluna link (opcional - link para ação relacionada)
ALTER TABLE notifications 
ADD COLUMN IF NOT EXISTS link VARCHAR(500);

-- Adicionar coluna actor_id (opcional - ID do usuário que causou a notificação)
ALTER TABLE notifications 
ADD COLUMN IF NOT EXISTS actor_id UUID;

-- Adicionar coluna role_scope (opcional - contexto do papel do usuário)
ALTER TABLE notifications 
ADD COLUMN IF NOT EXISTS role_scope VARCHAR(50);

-- Adicionar constraint para garantir que pelo menos academy_id ou user_id seja fornecido
ALTER TABLE notifications 
ADD CONSTRAINT notifications_target_check 
CHECK (academy_id IS NOT NULL OR user_id IS NOT NULL);

-- Adicionar índices para performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, read, created_at DESC) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_actor_id ON notifications(actor_id) WHERE actor_id IS NOT NULL;

-- Comentários
COMMENT ON COLUMN notifications.user_id IS 'ID do usuário destinatário (null para notificações de academia)';
COMMENT ON COLUMN notifications.link IS 'Link opcional para ação relacionada à notificação';
COMMENT ON COLUMN notifications.actor_id IS 'ID do usuário que causou a notificação';
COMMENT ON COLUMN notifications.role_scope IS 'Contexto do papel do usuário (aluno, professor, etc)';
