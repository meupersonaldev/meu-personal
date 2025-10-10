const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Supabase setup
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function seedCatalogs() {
  console.log('==> Populando catalogos globais de pacotes...');

  try {
    // Buscar franqueadoras ativas
    const { data: franqueadoras, error: franqueadoraError } = await supabase
      .from('franqueadora')
      .select('id, name')
      .eq('is_active', true);

    if (franqueadoraError) {
      console.error('Erro ao buscar franqueadoras:', franqueadoraError);
      return;
    }

    if (!franqueadoras || franqueadoras.length === 0) {
    console.warn('Nenhuma franqueadora ativa encontrada. Abortando geracao de pacotes.');
      return;
    }

    console.log(`Encontradas ${franqueadoras.length} franqueadora(s).`);

    for (const franqueadora of franqueadoras) {
      console.log(`-> Criando pacotes padrao para "${franqueadora.name}"`);

      const studentPackages = [
        {
          franqueadora_id: franqueadora.id,
          unit_id: null,
          title: 'Pacote Essencial - 5 Aulas',
          classes_qty: 5,
          price_cents: 19900,
          status: 'active',
          metadata_json: { description: 'Ideal para iniciar na rede', category: 'starter' }
        },
        {
          franqueadora_id: franqueadora.id,
          unit_id: null,
          title: 'Pacote Intensivo - 12 Aulas',
          classes_qty: 12,
          price_cents: 39900,
          status: 'active',
          metadata_json: { description: 'Economia para treinos frequentes', category: 'intensive' }
        }
      ];

      const { error: studentPackagesError } = await supabase
        .from('student_packages')
        .insert(studentPackages);

      if (studentPackagesError) {
        console.error(`Erro ao inserir pacotes de aluno para ${franqueadora.name}:`, studentPackagesError);
      } else {
        console.log(`Pacotes de aluno criados para ${franqueadora.name}.`);
      }

      const hourPackages = [
        {
          franqueadora_id: franqueadora.id,
          unit_id: null,
          title: 'Pacote Professor - 12 Horas',
          hours_qty: 12,
          price_cents: 18000,
          status: 'active',
          metadata_json: { description: 'Ideal para quem esta comecando a atender', category: 'starter' }
        },
        {
          franqueadora_id: franqueadora.id,
          unit_id: null,
          title: 'Pacote Professor - 30 Horas',
          hours_qty: 30,
          price_cents: 42000,
          status: 'active',
          metadata_json: { description: 'Mais disponibilidade com custo reduzido', category: 'pro' }
        }
      ];

      const { error: hourPackagesError } = await supabase
        .from('hour_packages')
        .insert(hourPackages);

      if (hourPackagesError) {
        console.error(`Erro ao inserir pacotes de horas para ${franqueadora.name}:`, hourPackagesError);
      } else {
        console.log(`Pacotes de horas criados para ${franqueadora.name}.`);
      }
    }

    console.log('Verificando pacotes gerados...');

    const { data: studentPackages, error: studentError } = await supabase
      .from('student_packages')
      .select('id, title, classes_qty, price_cents, franqueadora_id')
      .eq('status', 'active');

    if (studentError) {
      console.error('Erro ao verificar pacotes de aluno:', studentError);
    } else {
      console.log(`Total de pacotes de aluno ativos: ${studentPackages.length}`);
    }

    const { data: hourPackages, error: hourError } = await supabase
      .from('hour_packages')
      .select('id, title, hours_qty, price_cents, franqueadora_id')
      .eq('status', 'active');

    if (hourError) {
      console.error('Erro ao verificar pacotes de horas:', hourError);
    } else {
      console.log(`Total de pacotes de horas ativos: ${hourPackages.length}`);
    }

    console.log('Catalogos gerados com sucesso.');
  } catch (error) {
    console.error('Erro durante a populacao dos catalogos:', error);
    process.exit(1);
  }
}

seedCatalogs();
