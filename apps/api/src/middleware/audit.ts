import { Request, Response, NextFunction } from 'express';
import { auditService } from '../services/audit.service';

/**
 * Middleware para adicionar informações de auditoria ao request
 */
export function auditMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Extrair informações do request para uso posterior
  req.audit = {
    ipAddress: req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'] as string,
    userAgent: req.headers['user-agent'] || '',
    timestamp: new Date().toISOString()
  };

  next();
}

/**
 * Middleware para log automático de eventos de autenticação
 */
export function auditAuthEvent(operation: 'LOGIN' | 'LOGOUT') {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Capturar resposta para saber se foi bem-sucedida
    const originalSend = res.send;
    let responseData: any;

    res.send = function(data) {
      responseData = data;
      return originalSend.call(this, data);
    };

    // Processar log após a resposta
    res.on('finish', async () => {
      // Apenas logar se a operação foi bem-sucedida (status 2xx)
      if (res.statusCode >= 200 && res.statusCode < 300 && req.user) {
        try {
          await auditService.logAuthEvent(
            operation,
            req.user.userId,
            req.user.role,
            req.audit?.ipAddress,
            req.audit?.userAgent,
            {
              timestamp: req.audit?.timestamp,
              response_status: res.statusCode
            }
          );
        } catch (error) {
          console.error('❌ Erro no middleware de audit auth:', error);
        }
      }
    });

    next();
  };
}

/**
 * Middleware para log automático de operações sensíveis
 */
export function auditSensitiveOperation(operation: string, tableName: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Capturar dados antes e depois da operação
    const originalSend = res.send;
    let responseData: any;

    res.send = function(data) {
      responseData = data;
      return originalSend.call(this, data);
    };

    // Processar log após a resposta
    res.on('finish', async () => {
      // Apenas logar se a operação foi bem-sucedida
      if (res.statusCode >= 200 && res.statusCode < 300 && req.user) {
        try {
          const recordId = req.params.id || responseData?.id || 'unknown';

          await auditService.createLog({
            tableName,
            recordId,
            operation: operation as any,
            actorId: req.user.userId,
            actorRole: req.user.role,
            newValues: {
              ...req.body,
              ...responseData
            },
            metadata: {
              method: req.method,
              path: req.path,
              timestamp: req.audit?.timestamp,
              response_status: res.statusCode
            },
            ipAddress: req.audit?.ipAddress,
            userAgent: req.audit?.userAgent
          });
        } catch (error) {
          console.error('❌ Erro no middleware de audit operation:', error);
        }
      }
    });

    next();
  };
}

/**
 * Estender interface Request para incluir informações de auditoria
 */
declare global {
  namespace Express {
    interface Request {
      audit?: {
        ipAddress?: string;
        userAgent?: string;
        timestamp?: string;
      };
    }
  }
}
