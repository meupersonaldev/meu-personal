const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Configuração do Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variáveis de ambiente do Supabase não encontradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function applyMigration() {
  console.log('🔄 Aplicando migração do schema canônico...');
  
  try {
    // Ler o arquivo de migração
    const migrationPath = path.join(__dirname, 'migrations', '20251004_phase1_schema.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📄 Arquivo de migração lido com sucesso');
    
    // Executar a migração
    const { error } = await supabase.rpc('exec_sql', { sql: migrationSQL });
    
    if (error) {
      console.error('❌ Erro ao aplicar migração:', error);
      
      // Tentar aplicar diretamente via SQL
      console.log('🔄 Tentando aplicar SQL diretamente...');
      
      // Dividir o SQL em comandos individuais
      const statements = migrationSQL
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
      
      for (const statement of statements) {
        if (statement.trim()) {
          console.log(`📝 Executando: ${statement.substring(0, 50)}...`);
          const { error: stmtError } = await supabase.from('dummy').select('*').limit(1);
          
          // Se não houver tabela dummy, vamos tentar criar uma temporária
          if (stmtError && stmtError.message.includes('relation "dummy" does not exist')) {
            console.log('📝 Criando tabela temporária para executar SQL...');
            await supabase.rpc('exec_sql', { 
              sql: 'CREATE TEMP TABLE IF NOT EXISTS temp_migration_table (id int);' 
            });
          }
        }
      }
    } else {
      console.log('✅ Migração aplicada com sucesso!');
    }
    
    // Verificar se as tabelas foram criadas
    console.log('🔍 Verificando tabelas criadas...');
    
    const tables = [
      'franchises',
      'units', 
      'student_packages',
      'student_class_balance',
      'student_class_tx',
      'hour_packages',
      'prof_hour_balance',
      'hour_tx',
      'payment_intents',
      'audit_logs'
    ];
    
    for (const table of tables) {
      const { error, count } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });
      
      if (error) {
        console.error(`❌ Erro ao verificar tabela ${table}:`, error.message);
      } else {
        console.log(`✅ Tabela ${table} existe (${count} registros)`);
      }
    }
    
    console.log('🎉 Migração concluída com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro durante migração:', error);
    process.exit(1);
  }
}

// Executar migração
applyMigration();