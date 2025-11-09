# Melhorias Mobile - Área do Aluno (/aluno)

## Princípios de Design Mobile-First

### 1. **Espaçamento e Padding**
- Padding mínimo: `p-3` (12px) em mobile, `sm:p-6` (24px) em desktop
- Gap entre elementos: `gap-3` (12px) em mobile, `sm:gap-5` (20px) em desktop
- Margens laterais: `mx-3` ou `px-3` para evitar elementos colados nas bordas

### 2. **Tipografia Responsiva**
- Títulos principais: `text-xl sm:text-2xl md:text-3xl`
- Subtítulos: `text-base sm:text-lg md:text-xl`
- Texto corpo: `text-sm sm:text-base`
- Texto pequeno: `text-xs sm:text-sm`

### 3. **Botões e Interações**
- Altura mínima: `h-11` (44px) para touch targets
- Largura total em mobile: `w-full` quando apropriado
- Ícones: `h-4 w-4` ou `h-5 w-5` para boa visibilidade
- Espaçamento entre botões: `gap-2` ou `gap-3`

### 4. **Cards e Containers**
- Border radius: `rounded-lg` ou `rounded-xl`
- Sombras: `shadow-sm` em mobile, `sm:shadow-md` em desktop
- Evitar cards muito largos em mobile (max-width ou grid responsivo)

### 5. **Navegação e Layout**
- Menu fixo no topo com altura adequada
- Scroll suave e sem overflow horizontal
- Bottom navigation ou tabs para ações principais
- Breadcrumbs ocultos em mobile se necessário

---

## Páginas Prioritárias para Melhorias

### ✅ 1. `/aluno/professores` (CONCLUÍDO)
- Layout step-by-step otimizado
- Cards de professores redesenhados
- Grid responsivo: 1 col mobile, 2 tablet, 3 desktop

### 🔄 2. `/aluno/dashboard` (EM ANDAMENTO)

**Problemas identificados:**
- Stats cards podem ficar apertados em mobile
- Tabs de navegação (Visão Geral, Aulas, Configurações) precisam melhor touch target
- Formulários de configuração precisam melhor espaçamento
- Modal de avaliação precisa ser responsivo

**Melhorias necessárias:**
```tsx
// Stats Grid
<div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
  {/* Cards com padding adequado */}
  <Card className="p-3 sm:p-4">
    <CardContent className="p-0">
      {/* Ícone e texto */}
    </CardContent>
  </Card>
</div>

// Tabs de navegação
<div className="flex gap-2 overflow-x-auto pb-2 -mx-3 px-3 sm:mx-0 sm:px-0">
  <Button className="h-11 px-4 whitespace-nowrap">
    Visão Geral
  </Button>
</div>

// Formulários
<div className="space-y-4 sm:space-y-6">
  <div className="space-y-2">
    <Label className="text-sm">Nome</Label>
    <Input className="h-11 sm:h-12" />
  </div>
</div>
```

### 🔄 3. `/aluno/inicio`

**Melhorias necessárias:**
- Hero section com altura adequada em mobile
- CTAs (Comprar Créditos, Agendar Aula) com botões grandes
- Cards de features em grid responsivo
- Saldo de créditos destacado e legível

### 🔄 4. `/aluno/comprar`

**Melhorias necessárias:**
- Cards de pacotes em coluna única em mobile
- Botões de compra com altura mínima 44px
- Informações de preço bem legíveis
- Modal de checkout responsivo
- Formulário de pagamento com campos grandes

### 🔄 5. `/aluno/agendar`

**Melhorias necessárias:**
- Calendário responsivo (usar lib mobile-friendly)
- Seleção de horários em grid adequado
- Resumo da aula em card fixo no bottom em mobile
- Botão de confirmação sempre visível

### 🔄 6. `/aluno/historico`

**Melhorias necessárias:**
- Lista de aulas em cards verticais (não tabela)
- Filtros em dropdown/sheet em mobile
- Badges de status bem visíveis
- Ações (cancelar, avaliar) em menu de contexto

### 🔄 7. `/aluno/checkins`

**Melhorias necessárias:**
- Scanner QR em fullscreen em mobile
- Instruções claras e grandes
- Feedback visual imediato
- Botão de voltar sempre acessível

---

## Padrão de Implementação

### Template de Card Responsivo
```tsx
<Card className="border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
  <CardHeader className="p-3 sm:p-4 md:p-6 border-b">
    <CardTitle className="text-base sm:text-lg md:text-xl flex items-center gap-2">
      <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
      <span>Título</span>
    </CardTitle>
  </CardHeader>
  <CardContent className="p-3 sm:p-4 md:p-6">
    {/* Conteúdo */}
  </CardContent>
</Card>
```

### Template de Botão Responsivo
```tsx
<Button className="w-full sm:w-auto h-11 sm:h-12 px-4 sm:px-6 text-sm sm:text-base">
  <Icon className="mr-2 h-4 w-4" />
  Texto do Botão
</Button>
```

### Template de Grid Responsivo
```tsx
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
  {/* Items */}
</div>
```

---

## Checklist de Verificação Mobile

- [ ] Touch targets mínimos de 44x44px
- [ ] Sem overflow horizontal
- [ ] Textos legíveis (mínimo 14px)
- [ ] Espaçamento adequado entre elementos
- [ ] Botões acessíveis com polegar
- [ ] Modais/sheets responsivos
- [ ] Formulários com campos grandes
- [ ] Loading states visíveis
- [ ] Feedback visual em ações
- [ ] Navegação intuitiva

---

## Próximos Passos

1. ✅ Professores (concluído)
2. 🔄 Dashboard (iniciar)
3. 🔄 Início
4. 🔄 Comprar
5. 🔄 Agendar
6. 🔄 Histórico
7. 🔄 Check-ins
