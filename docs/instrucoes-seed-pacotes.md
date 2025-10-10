# Seed de pacotes globais (aluno e professor)

Este seed cria os pacotes padrão de créditos/horas por franqueadora, alinhados com a nova lógica global (2 planos para aluno e 2 para professor).

## Passos

1. Certifique-se de que as variáveis de ambiente do Supabase estejam configuradas:
   ```bash
   export SUPABASE_URL="https://xxx.supabase.co"
   export SUPABASE_SERVICE_ROLE_KEY="chave_service_role"
   ```
   > Em Windows PowerShell:
   > ```powershell
   > $env:SUPABASE_URL="https://xxx.supabase.co"
   > $env:SUPABASE_SERVICE_ROLE_KEY="chave_service_role"
   > ```

2. A partir da raiz do projeto, execute:
   ```bash
   node apps/api/seed-catalogs.js
   ```

3. O script cria os seguintes pacotes para **cada franqueadora ativa**:
   - Alunos:
     - `Pacote Essencial - 5 Aulas` – 5 aulas / R$ 199,00
     - `Pacote Intensivo - 12 Aulas` – 12 aulas / R$ 399,00
   - Professores:
     - `Pacote Professor - 12 Horas` – 12 horas / R$ 180,00
     - `Pacote Professor - 30 Horas` – 30 horas / R$ 420,00

4. Caso queira resetar os dados antes de rodar o seed, limpe as tabelas relevantes no Supabase (por exemplo `student_packages` e `hour_packages`) antes de executar o comando.
