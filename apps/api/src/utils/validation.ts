/**
 * Utilitários de validação
 */

import https from 'https'

/**
 * Valida CPF consultando API externa (ReceitaWS ou similar)
 * Retorna true se o CPF existe e está válido na Receita Federal
 */
export async function validateCpfWithAPI(cpf: string): Promise<{ valid: boolean; error?: string }> {
  const cleanCpf = cpf.replace(/\D/g, '')
  
  if (cleanCpf.length !== 11) {
    return { valid: false, error: 'CPF deve ter 11 dígitos' }
  }

  // Primeiro valida dígitos verificadores localmente
  if (!validateCpf(cleanCpf)) {
    return { valid: false, error: 'CPF com dígitos verificadores inválidos' }
  }

  // Se não estiver configurado para usar API, retorna apenas validação local
  if (process.env.ENABLE_CPF_API_VALIDATION !== 'true') {
    return { valid: true }
  }

  try {
    // Brasil API é a API padrão (gratuita e confiável)
    // Endpoint: GET https://brasilapi.com.br/api/cpf/v1/{cpf}
    // Retorna: { cpf: '...', nome: '...', nascimento: '...', situacao: '...' } ou erro 404
    const apiUrl = process.env.CPF_VALIDATION_API_URL || 'https://brasilapi.com.br/api/cpf/v1'
    
    // Formatar URL - Brasil API usa formato: /api/cpf/v1/{cpf}
    const url = apiUrl.includes('{cpf}') 
      ? apiUrl.replace('{cpf}', cleanCpf)
      : `${apiUrl}/${cleanCpf}`
    
    return new Promise((resolve) => {
      const req = https.get(url, {
        headers: {
          'User-Agent': 'MeuPersonal/1.0',
          'Accept': 'application/json'
        },
        timeout: 5000
      }, (res) => {
        let data = ''
        
        res.on('data', (chunk) => {
          data += chunk
        })
        
        res.on('end', () => {
          // Brasil API retorna 404 se CPF não for encontrado
          if (res.statusCode === 404) {
            console.warn('CPF não encontrado na Brasil API (404)')
            resolve({ 
              valid: false, 
              error: 'CPF não encontrado nos registros oficiais da Receita Federal' 
            })
            return
          }
          
          // Outros erros HTTP
          if (res.statusCode && res.statusCode >= 400) {
            console.warn(`Erro HTTP ${res.statusCode} da Brasil API`)
            // Aceita se dígitos estão corretos (API pode estar temporariamente indisponível)
            resolve({ valid: true })
            return
          }
          
          try {
            const result = JSON.parse(data)
            
            // Brasil API retorna objeto com dados do CPF se válido:
            // { cpf: '12345678900', nome: '...', nascimento: '...', situacao: '...' }
            // Se tiver campo 'cpf', significa que foi encontrado e é válido
            if (result.cpf || result.nome) {
              // CPF encontrado e válido na Receita Federal
              console.log('✅ CPF validado com sucesso via Brasil API:', cleanCpf.substring(0, 3) + '***')
              resolve({ valid: true })
            } else if (result.message || result.error) {
              // Erro explícito da API
              const errorMsg = result.message || result.error || 'CPF não encontrado nos registros oficiais'
              console.warn('CPF rejeitado pela Brasil API:', errorMsg)
              resolve({ 
                valid: false, 
                error: errorMsg
              })
            } else {
              // Resposta desconhecida - aceita se dígitos estão corretos (fallback)
              console.warn('Brasil API retornou resposta desconhecida, mas CPF tem dígitos válidos:', result)
              resolve({ valid: true })
            }
          } catch (parseError) {
            console.warn('Erro ao parsear resposta da Brasil API:', parseError)
            // Se não conseguir parsear, aceita se dígitos estão corretos
            resolve({ valid: true })
          }
        })
      })
      
      req.on('error', (error) => {
        console.warn('Erro ao consultar API de validação de CPF:', error.message)
        // Se API falhar, aceita se dígitos estão corretos
        resolve({ valid: true })
      })
      
      req.on('timeout', () => {
        req.destroy()
        console.warn('Timeout ao consultar API de validação de CPF')
        // Se timeout, aceita se dígitos estão corretos
        resolve({ valid: true })
      })
      
      req.setTimeout(5000)
    })
  } catch (error: any) {
    console.warn('Erro ao validar CPF via API:', error.message)
    // Se der erro, aceita se dígitos estão corretos
    return { valid: true }
  }
}

/**
 * Valida se um CPF ou CNPJ é válido (verifica dígitos verificadores)
 */
export function validateCpfCnpj(value: string): boolean {
  if (!value || typeof value !== 'string') {
    return false;
  }

  // Remove todos os caracteres não numéricos
  const digits = value.replace(/\D/g, '');

  // Verifica se todos os dígitos são iguais (inválido)
  if (digits.length > 0 && digits.split('').every(d => d === digits[0])) {
    return false;
  }

  // Valida CPF (11 dígitos)
  if (digits.length === 11) {
    return validateCpf(digits);
  }

  // Valida CNPJ (14 dígitos)
  if (digits.length === 14) {
    return validateCnpj(digits);
  }

  // Comprimento inválido
  return false;
}

/**
 * Valida CPF verificando os dígitos verificadores
 */
export function validateCpf(cpf: string): boolean {
  if (cpf.length !== 11) {
    return false;
  }

  // Calcula o primeiro dígito verificador
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cpf[i]) * (10 - i);
  }
  let remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cpf[9])) {
    return false;
  }

  // Calcula o segundo dígito verificador
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cpf[i]) * (11 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cpf[10])) {
    return false;
  }

  return true;
}

/**
 * Valida CNPJ verificando os dígitos verificadores
 */
function validateCnpj(cnpj: string): boolean {
  if (cnpj.length !== 14) {
    return false;
  }

  // Calcula o primeiro dígito verificador
  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(cnpj[i]) * weights1[i];
  }
  let remainder = sum % 11;
  let digit1 = remainder < 2 ? 0 : 11 - remainder;
  if (digit1 !== parseInt(cnpj[12])) {
    return false;
  }

  // Calcula o segundo dígito verificador
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  sum = 0;
  for (let i = 0; i < 13; i++) {
    sum += parseInt(cnpj[i]) * weights2[i];
  }
  remainder = sum % 11;
  let digit2 = remainder < 2 ? 0 : 11 - remainder;
  if (digit2 !== parseInt(cnpj[13])) {
    return false;
  }

  return true;
}

