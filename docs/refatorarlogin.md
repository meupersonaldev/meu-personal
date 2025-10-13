# Plano de Ação — Refatoração do Login por Frente

## Objetivo
Separar completamente os fluxos de autenticação de alunos e professores, mantendo apenas o que é compartilhável em um layout/componentes comuns e eliminando rotas/código morto ligado ao login unificado antigo. O resultado esperado é um acesso dedicado para cada frente (professor e aluno), coerente com os demais domínios (franqueadora/franquia), com cópias e redirecionamentos alinhados e sem duplicidade de código órfão.

---

## Pré-Requisitos
- Ambiente de desenvolvimento funcional com o projeto `apps/web` rodando localmente.
- Verificar se há alterações pendentes de commit e decidir se será criada branch específica.
- Garantir que não há usuários logados (limpar cookies/cache) para facilitar os testes.

---

## Passo a Passo

### 1. Mapeamento e limpeza inicial
1.1 Inspecionar rotas existentes em `apps/web/app` e listar arquivos que tocam `/login`, `/aluno`, `/professor`, `/student`, `/teacher`.
1.2 Localizar referências a `/login` via `rg -F "/login" apps/web` e documentar redirecionamentos/links que precisarão de ajuste.
1.3 Identificar diretórios redundantes (`app/student`, `app/teacher`, `app/dashboard`) e confirmar se o conteúdo é totalmente substituível.

### 2. Componentes e layout compartilhado
2.1 Criar `apps/web/components/auth/login-template.tsx` (ou reaproveitar se já existir) responsável por renderizar o layout comum de login, parametrizado por cópias e role esperada.
2.2 Garantir que o template ofereça pontos de customização (títulos, CTA, placeholders, mensagens de erro) e aceite callback opcional para pós-login.

### 3. Novas páginas de login
3.1 Em `apps/web/app/aluno/login/page.tsx`, consumir o template com `expectedRole="STUDENT"`, copy específica e `defaultRedirect` apontando para `/aluno/inicio`.
3.2 Em `apps/web/app/professor/login/page.tsx`, consumir o template com `expectedRole="TEACHER"`, copy específica e `defaultRedirect` apontando para `/professor/dashboard`.
3.3 Ajustar eventuais imports de CSS ou providers se necessário (caso as páginas estejam em route groups).

### 4. Atualização das proteções/guards
4.1 Atualizar `apps/web/middleware.ts`:
- Incluir `/aluno/login` e `/professor/login` como rotas de autenticação.
- Redirecionar rotas protegidas de `/aluno` e `/professor` para suas novas telas quando não houver `auth-token`.
- Impedir que usuários autenticados acessem telas públicas incorretas (ex.: aluno logado tentando `/professor/login`).
4.2 Revisar `app/professor/layout.tsx` e `app/aluno/inicio/page.tsx` (e quaisquer outros layouts/hooks) para trocar `router.push('/login')` pelos novos caminhos dedicados.
4.3 Corrigir fluxos dependentes, como `/checkin/a/[academyId]`, para redirecionar professores para `/professor/login` com query `redirect` preservada.

### 5. Ajuste de rotas auxiliares
5.1 Atualizar links em páginas de recuperação de senha (`/esqueci-senha`, `/redefinir-senha`) e cadastro (`/cadastro`) para apontar para as novas telas.
5.2 Revisar componentes compartilhados (`components/layout/header.tsx`, `mobile-nav`, etc.) para que botões “Entrar” direcionem conforme contexto (por padrão, `/login` passa a ser seletor de frente).
5.3 Garantir que `/login` se transforme numa página de escolha (professor x aluno) aproveitando o layout existente, mantendo acesso rápido às novas rotas.

### 6. Limpeza de código morto
6.1 Remover diretórios/rotas antigas que não serão mais usadas:
- `apps/web/app/student/**`
- `apps/web/app/teacher/**`
- Rotas dentro de `app/dashboard` que ficaram órfãs.
6.2 Revisar stores/hooks (`student-store`, `use-professor-data`) e arquivos em `components/dashboard` para confirmar se ainda possuem consumidores; remover o que estiver morto ou atualizar imports.
6.3 Eliminar comentários, TODOs e console logs relacionados ao login antigo.

### 7. Atualização de stores e helpers
7.1 Ajustar `auth-store.ts` para permitir logout sem redirecionar automaticamente quando for chamado de dentro dos novos fluxos (opção `logout({ redirect: false })`).
7.2 Verificar stores específicos (`franqueadora-store`, `franquia-store`) para garantir que continuam funcionando com o middleware atualizado.

### 8. Testes
8.1 Executar `npm run lint --workspace=web` para garantir consistência.
8.2 Rodar `npm run dev --workspace=web` e testar manualmente:
- Login de aluno (sucesso/erro, redirecionamento, refresh com cookie).
- Login de professor (sucesso/erro, check-in com redirect).
- Tentativas de acesso direto a `/professor/...` e `/aluno/...` sem autenticação.
- Fluxos de esqueci/redefinir senha, cadastro e logout.
8.3 Validar cookies e tokens: conferir que `auth-token` continua sendo setado/limpo corretamente.

### 9. Documentação e entrega
9.1 Atualizar README ou documentação interna mencionando as novas rotas de login.
9.2 Registrar mudanças relevantes em changelog ou no plano de refatoração principal.
9.3 Criar commit (ou MR) descrevendo a refatoração e sugerir revisão focada nos fluxos sensíveis (middleware, stores, layouts).

---

## Checklist de Conclusão
- [ ] Novas telas `/aluno/login` e `/professor/login` funcionando com copy específica.
- [ ] `/login` convertido em tela de seleção de perfil.
- [ ] Middleware atualizado sem gerar loops.
- [ ] Guard/layouts, check-in e links ajustados.
- [ ] Código morto removido (rotas antigas, dashboards não usados, stores órfãos).
- [ ] Testes manuais e lint executados.
- [ ] Documentação atualizada.

---

## Riscos e Mitigações
- **Loop de redirecionamento:** garantir que middleware e layouts só redirecionem quando necessário e ignorem as rotas públicas corretas.
- **Links externos quebrados:** manter `/login` acessível como hub (componente simples de escolha) para não invalidar materiais anteriores.
- **Divergência de mensagens:** alinhar copy com time de conteúdo antes de finalizar.
- **Estado de autenticação:** validar se `useAuthStore.initialize()` continua atendendo ambos perfis no SSR/CSR.

---

## Próximos Passos
- Criar branch dedicada para a refatoração.
- Seguir o passo a passo acima.
- Validar em ambiente de staging antes de publicar.