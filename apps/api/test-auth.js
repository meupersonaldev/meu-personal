const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// Teste básico de autenticação JWT
async function testAuth() {
  console.log('🧪 Testando autenticação JWT...');
  
  try {
    // 1. Testar geração de token
    const payload = {
      userId: 'test-user-id',
      email: 'test@example.com',
      role: 'STUDENT'
    };
    
    const token = jwt.sign(payload, process.env.JWT_SECRET || 'test-secret', { expiresIn: '24h' });
    console.log('✅ Token JWT gerado com sucesso');
    
    // 2. Testar verificação de token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'test-secret');
    console.log('✅ Token JWT verificado com sucesso:', decoded);
    
    // 3. Testar hash de senha
    const password = 'test123';
    const hashedPassword = await bcrypt.hash(password, 10);
    console.log('✅ Hash de senha gerado com sucesso');
    
    // 4. Testar comparação de senha
    const isValid = await bcrypt.compare(password, hashedPassword);
    console.log('✅ Comparação de senha:', isValid ? 'válida' : 'inválida');
    
    console.log('🎉 Todos os testes de autenticação passaram!');
    return true;
  } catch (error) {
    console.error('❌ Erro nos testes de autenticação:', error);
    return false;
  }
}

// Executar teste
testAuth().then(success => {
  process.exit(success ? 0 : 1);
});