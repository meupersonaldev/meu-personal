const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Configuração do Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function seedCatalogs() {
  console.log('🌱 Populando catálogos de pacotes...');
  
  try {
    // Obter unidades existentes
    const { data: units, error: unitsError } = await supabase
      .from('units')
      .select('id, name');
    
    if (unitsError) {
      console.error('❌ Erro ao buscar unidades:', unitsError);
      return;
    }
    
    console.log(`📍 Found ${units.length} units`);
    
    // Para cada unidade, criar pacotes de aluno
    for (const unit of units) {
      console.log(`📦 Creating packages for unit: ${unit.name}`);
      
      // Pacotes de aluno (student_packages)
      const studentPackages = [
        {
          unit_id: unit.id,
          title: 'Pacote Inicial - 5 Aulas',
          classes_qty: 5,
          price_cents: 19900, // R$ 199,00
          status: 'active',
          metadata_json: { description: 'Ideal para experimentar', category: 'starter' }
        },
        {
          unit_id: unit.id,
          title: 'Pacote Regular - 10 Aulas',
          classes_qty: 10,
          price_cents: 34900, // R$ 349,00
          status: 'active',
          metadata_json: { description: 'Mais economia por aula', category: 'regular' }
        },
        {
          unit_id: unit.id,
          title: 'Pacote Premium - 20 Aulas',
          classes_qty: 20,
          price_cents: 59900, // R$ 599,00
          status: 'active',
          metadata_json: { description: 'Melhor custo-benefício', category: 'premium' }
        },
        {
          unit_id: unit.id,
          title: 'Pacote Master - 50 Aulas',
          classes_qty: 50,
          price_cents: 129900, // R$ 1.299,00
          status: 'active',
          metadata_json: { description: 'Para alunos dedicados', category: 'master' }
        }
      ];
      
      // Inserir pacotes de aluno
      const { error: studentPackagesError } = await supabase
        .from('student_packages')
        .insert(studentPackages);
      
      if (studentPackagesError) {
        console.error(`❌ Erro ao inserir pacotes de aluno para ${unit.name}:`, studentPackagesError);
      } else {
        console.log(`✅ Student packages created for ${unit.name}`);
      }
      
      // Pacotes de horas para professores (hour_packages)
      const hourPackages = [
        {
          unit_id: unit.id,
          title: 'Pacote Professor - 10 Horas',
          hours_qty: 10,
          price_cents: 15000, // R$ 150,00
          status: 'active',
          metadata_json: { description: 'Para professores iniciantes', category: 'basic' }
        },
        {
          unit_id: unit.id,
          title: 'Pacote Professor - 25 Horas',
          hours_qty: 25,
          price_cents: 32500, // R$ 325,00
          status: 'active',
          metadata_json: { description: 'Bom para meio período', category: 'regular' }
        },
        {
          unit_id: unit.id,
          title: 'Pacote Professor - 50 Horas',
          hours_qty: 50,
          price_cents: 50000, // R$ 500,00
          status: 'active',
          metadata_json: { description: 'Para professores dedicados', category: 'premium' }
        },
        {
          unit_id: unit.id,
          title: 'Pacote Professor - 100 Horas',
          hours_qty: 100,
          price_cents: 80000, // R$ 800,00
          status: 'active',
          metadata_json: { description: 'Melhor custo-benefício', category: 'master' }
        }
      ];
      
      // Inserir pacotes de horas
      const { error: hourPackagesError } = await supabase
        .from('hour_packages')
        .insert(hourPackages);
      
      if (hourPackagesError) {
        console.error(`❌ Erro ao inserir pacotes de horas para ${unit.name}:`, hourPackagesError);
      } else {
        console.log(`✅ Hour packages created for ${unit.name}`);
      }
    }
    
    // Verificar resultados
    console.log('🔍 Verificando pacotes criados...');
    
    const { data: studentPackages, error: studentError } = await supabase
      .from('student_packages')
      .select('id, title, classes_qty, price_cents, units(name)')
      .eq('status', 'active');
    
    if (studentError) {
      console.error('❌ Erro ao verificar pacotes de aluno:', studentError);
    } else {
      console.log(`✅ ${studentPackages.length} student packages created`);
    }
    
    const { data: hourPackages, error: hourError } = await supabase
      .from('hour_packages')
      .select('id, title, hours_qty, price_cents, units(name)')
      .eq('status', 'active');
    
    if (hourError) {
      console.error('❌ Erro ao verificar pacotes de horas:', hourError);
    } else {
      console.log(`✅ ${hourPackages.length} hour packages created`);
    }
    
    console.log('🎉 Catálogos populados com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro durante população dos catálogos:', error);
    process.exit(1);
  }
}

// Executar população
seedCatalogs();