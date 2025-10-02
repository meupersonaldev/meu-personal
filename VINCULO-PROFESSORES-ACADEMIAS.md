# Vínculo de Professores com Academias

## 📋 Como Funciona

Quando um professor se vincula a uma academia, ele é automaticamente registrado no banco de dados daquela unidade através da tabela `academy_teachers`.

## 🔄 Fluxo Atual (JÁ IMPLEMENTADO) ✅

### 1. **Cadastro de Professor pela Franquia**

**Endpoint:** `POST /api/teachers`

**Fluxo:**
```
1. Franquia cadastra professor no dashboard
2. Backend cria usuário na tabela `users` (role: TEACHER)
3. Backend cria perfil na tabela `teacher_profiles`
4. ✅ Backend cria vínculo na tabela `academy_teachers`
   - teacher_id: ID do professor
   - academy_id: ID da academia
   - status: 'active'
   - commission_rate: Taxa de comissão (padrão 70%)
5. Professor está vinculado e ativo!
```

**Código (já implementado):**
```typescript
// Linha 572-581 em teachers.ts
const { data: academyTeacher, error: academyError } = await supabase
  .from('academy_teachers')
  .insert({
    teacher_id: user.id,
    academy_id,
    status: 'active',
    commission_rate: commission_rate || 0.70
  })
  .select()
  .single()
```

### 2. **Professor se Cadastra Sozinho**

**Endpoint:** `POST /api/auth/register` (role: TEACHER)

**Fluxo:**
```
1. Professor se cadastra pelo app
2. Backend cria usuário na tabela `users`
3. Backend cria perfil na tabela `teacher_profiles`
4. Professor escolhe academias para trabalhar
5. ✅ Backend cria vínculos na tabela `academy_teachers`
6. Franquia aprova ou rejeita o vínculo
```

### 3. **Listar Professores de uma Academia**

**Endpoint:** `GET /api/teachers?academy_id={id}`

**Retorna apenas professores vinculados àquela academia:**
```typescript
// Linha 316-320 em teachers.ts
.eq('academy_teachers.status', 'active')
.eq('academy_teachers.academy_id', academy_id)
```

## 📊 Estrutura da Tabela `academy_teachers`

```sql
CREATE TABLE academy_teachers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  teacher_id UUID REFERENCES users(id) NOT NULL,
  academy_id UUID REFERENCES academies(id) NOT NULL,
  status VARCHAR(20) DEFAULT 'active', -- 'active', 'inactive', 'pending'
  commission_rate DECIMAL(5,2) DEFAULT 0.70, -- 70%
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(teacher_id, academy_id)
);
```

## 🎯 Funcionalidades Implementadas

### ✅ 1. Cadastro Automático
- Quando franquia cadastra professor → Vínculo criado automaticamente
- Status: `active`
- Taxa de comissão: Configurável (padrão 70%)

### ✅ 2. Múltiplas Academias
- Um professor pode trabalhar em várias academias
- Cada vínculo tem sua própria taxa de comissão
- Cada vínculo tem status independente

### ✅ 3. Controle de Status
- `active`: Professor ativo e pode dar aulas
- `inactive`: Professor desativado
- `pending`: Aguardando aprovação da franquia

### ✅ 4. Desativação
**Endpoint:** `DELETE /api/teachers/:id`

```typescript
// Linha 685-689 em teachers.ts
const { error: academyError } = await supabase
  .from('academy_teachers')
  .update({
    status: 'inactive',
    updated_at: new Date().toISOString()
  })
```

**Nota:** Usa soft delete (muda status para `inactive`)

## 📝 Exemplos de Uso

### Exemplo 1: Franquia Cadastra Professor

**Request:**
```bash
POST /api/teachers
Content-Type: application/json

{
  "name": "João Silva",
  "email": "joao@example.com",
  "phone": "11999999999",
  "cpf": "12345678900",
  "academy_id": "51716624-427f-42e9-8e85-12f9a3af8822",
  "specialties": ["Musculação", "Funcional"],
  "hourly_rate": 150,
  "commission_rate": 0.75
}
```

**Response:**
```json
{
  "id": "abc-123",
  "name": "João Silva",
  "email": "joao@example.com",
  "role": "TEACHER",
  "teacher_profiles": {
    "specialties": ["Musculação", "Funcional"],
    "hourly_rate": 150
  },
  "academy_teachers": [{
    "id": "def-456",
    "academy_id": "51716624-427f-42e9-8e85-12f9a3af8822",
    "status": "active",
    "commission_rate": 0.75
  }]
}
```

### Exemplo 2: Listar Professores da Academia

**Request:**
```bash
GET /api/teachers?academy_id=51716624-427f-42e9-8e85-12f9a3af8822
```

**Response:**
```json
{
  "teachers": [
    {
      "id": "abc-123",
      "name": "João Silva",
      "email": "joao@example.com",
      "academy_teachers": [{
        "academy_id": "51716624-427f-42e9-8e85-12f9a3af8822",
        "status": "active",
        "commission_rate": 0.75
      }]
    }
  ]
}
```

### Exemplo 3: Desativar Professor

**Request:**
```bash
DELETE /api/teachers/abc-123
```

**Response:**
```json
{
  "message": "Professor desativado com sucesso"
}
```

**Resultado:**
- Status na `academy_teachers` muda para `inactive`
- Professor não aparece mais na listagem ativa
- Dados são preservados (soft delete)

## 🔍 Queries Úteis

### Verificar professores de uma academia:
```sql
SELECT 
  u.id,
  u.name,
  u.email,
  at.status,
  at.commission_rate,
  at.created_at
FROM users u
INNER JOIN academy_teachers at ON u.id = at.teacher_id
WHERE at.academy_id = '51716624-427f-42e9-8e85-12f9a3af8822'
  AND at.status = 'active';
```

### Verificar academias de um professor:
```sql
SELECT 
  a.id,
  a.name,
  at.status,
  at.commission_rate
FROM academies a
INNER JOIN academy_teachers at ON a.id = at.academy_id
WHERE at.teacher_id = 'abc-123'
  AND at.status = 'active';
```

### Contar professores ativos por academia:
```sql
SELECT 
  a.name,
  COUNT(at.teacher_id) as total_professores
FROM academies a
LEFT JOIN academy_teachers at ON a.id = at.academy_id AND at.status = 'active'
GROUP BY a.id, a.name;
```

## ✅ Checklist de Funcionalidades

- [x] Cadastro de professor cria vínculo automaticamente
- [x] Suporte a múltiplas academias por professor
- [x] Taxa de comissão configurável por vínculo
- [x] Status de vínculo (active/inactive/pending)
- [x] Soft delete (preserva histórico)
- [x] Listagem filtrada por academia
- [x] Queries otimizadas com JOINs

## 🎯 Conclusão

**O sistema de vínculo professor-academia está 100% implementado e funcional!** ✅

Quando você cadastra um professor no dashboard da franquia:
1. ✅ Ele é criado no banco de dados
2. ✅ É automaticamente vinculado à academia
3. ✅ Fica disponível para dar aulas
4. ✅ Aparece na listagem de professores da academia

**Não há nada pendente de implementação!** 🎉

---

**Criado em**: 2025-10-02
**Status**: ✅ Implementado e Funcional
**Versão**: 1.0
