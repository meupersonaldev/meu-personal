-- Criar tabela de logs de auditoria para conformidade e segurança
-- Esta tabela registra todas as operações críticas do sistema

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email TEXT,
  user_role TEXT,
  action TEXT NOT NULL, -- LOGIN, LOGOUT, CREATE, UPDATE, DELETE, PERMISSION_DENIED, SECURITY_EVENT
  resource TEXT NOT NULL, -- auth, users, academies, franchises, etc.
  resource_id UUID,
  details JSONB, -- Detalhes adicionais da operação
  ip_address INET,
  user_agent TEXT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  success BOOLEAN NOT NULL DEFAULT true,
  error_message TEXT,
  franqueadora_id UUID REFERENCES franqueadora(id) ON DELETE SET NULL,
  academy_id UUID REFERENCES academies(id) ON DELETE SET NULL,
  
  -- Índices para performance
  CONSTRAINT audit_logs_user_id_check CHECK (user_id IS NOT NULL OR user_email IS NOT NULL)
);

-- Criar índices otimizados para consultas de auditoria
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource);
CREATE INDEX IF NOT EXISTS idx_audit_logs_franqueadora_id ON audit_logs(franqueadora_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_academy_id ON audit_logs(academy_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_success ON audit_logs(success);
CREATE INDEX IF NOT EXISTS idx_audit_logs_ip_address ON audit_logs(ip_address);

-- Índice composto para consultas comuns
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_timestamp ON audit_logs(user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_franqueadora_timestamp ON audit_logs(franqueadora_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action_timestamp ON audit_logs(action, timestamp DESC);

-- Função para limpar logs antigos (retention policy)
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  retention_days INTEGER := 365; -- Manter logs por 1 ano
  deleted_count INTEGER;
BEGIN
  DELETE FROM audit_logs 
  WHERE timestamp < NOW() - INTERVAL '1 day' * retention_days;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- Log da operação de limpeza
  INSERT INTO audit_logs (
    action,
    resource,
    details,
    timestamp,
    success
  ) VALUES (
    'CLEANUP',
    'audit_logs',
    json_build_object('deleted_count', deleted_count, 'retention_days', retention_days),
    NOW(),
    true
  );
  
END;
$$;

-- Grant permissões
GRANT SELECT, INSERT ON audit_logs TO authenticated;
GRANT SELECT, INSERT ON audit_logs TO service_role;
GRANT EXECUTE ON FUNCTION cleanup_old_audit_logs TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_old_audit_logs TO service_role;

-- Criar função para consulta de logs (com restrições de segurança)
CREATE OR REPLACE FUNCTION get_user_audit_logs(
  target_user_id UUID,
  limit_count INTEGER DEFAULT 100,
  offset_count INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  user_email TEXT,
  user_role TEXT,
  action TEXT,
  resource TEXT,
  resource_id UUID,
  details JSONB,
  ip_address INET,
  user_agent TEXT,
  timestamp TIMESTAMPTZ,
  success BOOLEAN,
  error_message TEXT,
  franqueadora_id UUID,
  academy_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Apenas usuários podem ver seus próprios logs ou admins podem ver todos
  IF NOT EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = auth.uid() AND 
    (auth.uid() = target_user_id OR 
     (raw_user_meta_data->>'role') IN ('admin', 'super_admin'))
  ) THEN
    RAISE EXCEPTION 'Permissão negada para consultar logs de auditoria';
  END IF;
  
  RETURN QUERY
  SELECT 
    a.id,
    a.user_id,
    a.user_email,
    a.user_role,
    a.action,
    a.resource,
    a.resource_id,
    a.details,
    a.ip_address,
    a.user_agent,
    a.timestamp,
    a.success,
    a.error_message,
    a.franqueadora_id,
    a.academy_id
  FROM audit_logs a
  WHERE a.user_id = target_user_id
  ORDER BY a.timestamp DESC
  LIMIT limit_count
  OFFSET offset_count;
END;
$$;

-- Grant permissão para a função de consulta
GRANT EXECUTE ON FUNCTION get_user_audit_logs TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_audit_logs TO service_role;

-- Comentar sobre a tabela
COMMENT ON TABLE audit_logs IS 'Tabela de auditoria para registrar todas as operações críticas do sistema';
COMMENT ON COLUMN audit_logs.action IS 'Tipo de ação: LOGIN, LOGOUT, CREATE, UPDATE, DELETE, PERMISSION_DENIED, SECURITY_EVENT';
COMMENT ON COLUMN audit_logs.resource IS 'Recurso afetado: auth, users, academies, franchises, etc.';
COMMENT ON COLUMN audit_logs.details IS 'Detalhes adicionais em formato JSON';
COMMENT ON COLUMN audit_logs.success IS 'Indica se a operação foi bem-sucedida';