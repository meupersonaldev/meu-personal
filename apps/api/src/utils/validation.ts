/**
 * Utilitários de validação
 */

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
function validateCpf(cpf: string): boolean {
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

