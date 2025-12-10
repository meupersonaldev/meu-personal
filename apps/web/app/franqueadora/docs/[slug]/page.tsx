import Link from 'next/link'
import { notFound } from 'next/navigation'
import ReactMarkdown from 'react-markdown'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import FranqueadoraGuard from '@/components/auth/franqueadora-guard'

interface DocPageProps {
    params: Promise<{
        slug: string
    }>
}

const manualFranqueadora = `# Manual da Franqueadora

Bem-vindo ao painel da Franqueadora! Este guia vai te ajudar a aproveitar ao máximo todas as funcionalidades disponíveis para gerenciar sua rede de franquias.

## O que você pode fazer aqui?

Como administrador da franqueadora, você tem acesso completo a todas as funcionalidades do sistema.

---

## 📊 Dashboard Principal

Ao acessar o sistema, você verá um painel com os principais indicadores da sua rede:

- **Total de Franquias** - Quantas unidades estão ativas na rede
- **Total de Professores** - Quantidade de profissionais cadastrados
- **Total de Alunos** - Base de clientes em toda a rede
- **Aulas Realizadas** - Volume de atendimentos

> 💡 **Dica:** Use esses números para acompanhar o crescimento da sua rede ao longo do tempo.

---

## 🏢 Gestão de Franquias

### Visualizar Franquias
Na seção "Franquias" você encontra a lista completa de todas as unidades da rede. Para cada franquia você pode ver:
- Nome e dados de contato
- Status (ativa/inativa)
- Quantidade de professores e alunos
- Configurações específicas

### Adicionar Nova Franquia
Para cadastrar uma nova unidade:
1. Clique em "Adicionar Franquia"
2. Preencha os dados básicos (nome, endereço, contato)
3. Configure os dados financeiros (CNPJ/CPF, dados bancários)
4. Defina as configurações iniciais

### Configurações da Franquia
Cada franquia pode ter configurações específicas:
- **Liberação Manual de Créditos** - Permite que a franquia libere créditos para alunos sem pagamento
- **Aprovação de Professores** - Define se novos professores precisam de aprovação

---

## 👥 Gestão de Usuários

### Contatos (Alunos e Professores)
Na seção "Usuários" você encontra todos os alunos e professores cadastrados na rede. Você pode:
- Filtrar por tipo (aluno ou professor)
- Buscar por nome ou email
- Ver em qual franquia cada pessoa está vinculada
- Atribuir usuários a franquias específicas

### Atribuição de Usuários
Quando um aluno ou professor se cadastra pelo site, ele fica como "não atribuído". Você pode:
1. Selecionar o usuário na lista
2. Escolher a franquia de destino
3. Confirmar a atribuição

---

## 💰 Créditos

### Liberação Manual de Créditos
Esta funcionalidade permite conceder créditos (aulas) para alunos ou horas para professores sem necessidade de pagamento. Útil para:
- Cortesias e bonificações
- Correções de saldo
- Promoções especiais

**Como usar:**
1. Acesse "Créditos" no menu
2. Busque o usuário pelo email
3. Selecione o tipo de crédito (aulas ou horas)
4. Informe a quantidade e o motivo
5. Confirme a liberação

### Histórico de Liberações
Todas as liberações ficam registradas com quem recebeu, quantidade, motivo, quem autorizou e data/hora.

---

## 📋 Políticas da Rede

### O que são Políticas?
Políticas são regras que se aplicam a toda a rede:
- Duração das aulas
- Créditos por aula
- Tolerância para check-in
- Regras de cancelamento

### Gerenciando Políticas
1. Acesse "Políticas" no menu
2. Visualize as regras atuais
3. Crie um rascunho para alterações
4. Publique quando estiver pronto

> ⚠️ **Importante:** Alterações nas políticas afetam toda a rede.

---

## 📦 Pacotes

### Pacotes de Aulas (Alunos)
Defina os pacotes de créditos que os alunos podem comprar: nome, quantidade de aulas e valor.

### Pacotes de Horas (Professores)
Configure pacotes de horas para professores se seu modelo de negócio exigir.

---

## 🔔 Notificações

O sistema envia notificações automáticas para eventos importantes como novos cadastros e solicitações de aprovação.

---

## ❓ Perguntas Frequentes

**Como desativar uma franquia?**
Acesse a franquia, vá em configurações e altere o status para "Inativa".

**Posso desfazer uma liberação de créditos?**
Não diretamente. Você precisaria fazer um ajuste manual.

**Como sei se um professor foi aprovado?**
Na lista de professores, o status de aprovação aparece ao lado do nome.

---

*Este manual é atualizado regularmente conforme novas funcionalidades são adicionadas.*`

const manualFranquia = `# Manual da Franquia

Bem-vindo ao painel da Franquia! Este guia vai te ajudar a gerenciar sua unidade de forma eficiente.

## O que você pode fazer aqui?

Como administrador da franquia, você gerencia sua unidade específica: professores, alunos, agenda e financeiro.

---

## 📊 Dashboard

Ao acessar o sistema, você verá os principais números da sua unidade:

- **Professores Ativos** - Quantos profissionais estão trabalhando
- **Alunos Ativos** - Sua base de clientes
- **Aulas Hoje** - Agendamentos do dia
- **Aulas da Semana** - Visão semanal

---

## 👨‍🏫 Gestão de Professores

### Lista de Professores
Veja todos os professores vinculados à sua unidade: nome, contato, status e horas disponíveis.

### Aprovar Professores
Quando um professor se cadastra, ele pode precisar de aprovação:
1. Acesse a lista de professores
2. Clique no professor pendente
3. Revise os dados e documentos (CREF)
4. Aprove ou rejeite o cadastro

---

## 👥 Gestão de Alunos

### Lista de Alunos
Visualize todos os alunos da sua unidade: nome, contato, créditos disponíveis e última aula.

### Histórico do Aluno
Clicando em um aluno você pode ver todas as aulas agendadas, histórico de compras e saldo de créditos.

---

## 📅 Agenda

### Visualização
A agenda mostra todos os agendamentos da unidade por dia, semana ou mês, com filtro por professor.

### Tipos de Status
- **Reservado** - Aula agendada, aguardando confirmação
- **Confirmado** - Aula paga/confirmada
- **Realizado** - Aula concluída
- **Cancelado** - Aula cancelada

---

## 💰 Créditos

### Liberação Manual
Se a franqueadora habilitou esta função, você pode liberar créditos:
1. Acesse "Créditos" no menu
2. Busque o aluno pelo email
3. Informe quantidade e motivo
4. Confirme

> ⚠️ **Nota:** Esta função só aparece se estiver habilitada pela franqueadora.

---

## ⚙️ Configurações

Configure os horários de funcionamento e slots de atendimento da sua unidade.

---

*Este manual é atualizado regularmente.*`

const manualProfessor = `# Manual do Professor

Bem-vindo ao Meu Personal! Este guia vai te ajudar a gerenciar sua agenda, alunos e acompanhar seus ganhos.

## Primeiros Passos

### Cadastro
1. Acesse o site e clique em "Sou Professor"
2. Preencha seus dados pessoais
3. Informe seu CREF (registro profissional)
4. Envie foto do documento CREF
5. Aguarde a aprovação da franquia

### Aprovação
Após o cadastro, a franquia irá revisar seus dados. Você receberá uma notificação quando for aprovado.

---

## 📅 Sua Agenda

### Visualizando Agendamentos
Na tela principal você vê todas as suas aulas:
- **Hoje** - Aulas do dia atual
- **Próximas** - Aulas agendadas
- **Histórico** - Aulas realizadas

### Status das Aulas
- 🟡 **Reservado** - Aluno agendou, aguardando confirmação
- 🟢 **Confirmado** - Aula confirmada
- ✅ **Realizado** - Aula concluída
- ❌ **Cancelado** - Aula cancelada

---

## ⏰ Disponibilidade

### Configurando seus Horários
Defina quando você está disponível para dar aulas:
1. Acesse "Disponibilidade" no menu
2. Selecione os dias da semana
3. Marque os horários disponíveis
4. Salve as alterações

> 💡 **Dica:** Mantenha sua disponibilidade sempre atualizada para receber mais agendamentos.

---

## 👥 Seus Alunos

### Lista de Alunos
Veja todos os alunos que já tiveram aula com você: nome, contato, quantidade de aulas e última aula.

### Agendar para o Aluno
Você pode criar agendamentos para seus alunos acessando a agenda e clicando em "Novo Agendamento".

---

## 💰 Carteira

### Acompanhando seus Ganhos
Na seção "Carteira" você vê horas disponíveis, histórico de transações e aulas realizadas.

### Horas
O sistema funciona com horas: você adquire pacotes e cada aula consome do seu saldo.

---

## 📱 Check-in

### QR Code
Para confirmar a presença do aluno:
1. Acesse "Check-in" no menu
2. Mostre o QR Code para o aluno
3. O aluno escaneia com o celular
4. A aula é marcada como realizada

---

## ❓ Dúvidas Frequentes

**Posso cancelar uma aula?**
Sim, mas respeite o prazo mínimo definido pela franquia.

**Posso atender em mais de uma unidade?**
Sim, você pode se vincular a múltiplas franquias.

---

*Este manual é atualizado regularmente.*`

const manualAluno = `# Manual do Aluno

Bem-vindo ao Meu Personal! Este guia vai te ajudar a agendar suas aulas, comprar créditos e aproveitar ao máximo o sistema.

## Primeiros Passos

### Cadastro
1. Acesse o site ou app
2. Clique em "Sou Aluno"
3. Preencha seus dados
4. Confirme seu email
5. Pronto! Você já pode usar o sistema

---

## 🏠 Tela Inicial

Ao entrar no sistema você verá:
- **Seus Créditos** - Quantas aulas você tem disponíveis
- **Próximas Aulas** - Seus agendamentos
- **Professores** - Lista de profissionais disponíveis

---

## 📅 Agendando Aulas

### Como Agendar
1. Clique em "Agendar Aula"
2. Escolha o professor
3. Selecione a data
4. Escolha o horário disponível
5. Confirme o agendamento

### Tipos de Agendamento
- **Aula Avulsa** - Uma única aula
- **Aula Recorrente** - Mesmo horário toda semana

> 💡 **Dica:** Aulas recorrentes garantem seu horário fixo com o professor.

---

## 💳 Comprando Créditos

### Pacotes Disponíveis
Veja os pacotes de aulas disponíveis na seção "Comprar": quantidade de aulas, valor e validade.

### Como Comprar
1. Acesse "Comprar Créditos"
2. Escolha o pacote desejado
3. Selecione a forma de pagamento (PIX, cartão, boleto)
4. Confirme a compra
5. Os créditos são liberados após confirmação do pagamento

---

## ✅ Check-in

### Confirmando sua Presença
No dia da aula:
1. Vá até a academia
2. O professor mostrará um QR Code
3. Escaneie com seu celular
4. Pronto! Sua presença está confirmada

> ⚠️ **Importante:** O check-in só pode ser feito próximo ao horário da aula.

---

## 📋 Histórico

### Suas Aulas
Na seção "Histórico" você encontra todas as aulas realizadas, canceladas e detalhes de cada atendimento.

### Seus Pagamentos
Veja também compras de créditos, valores pagos e datas das transações.

---

## 👨‍🏫 Seus Professores

### Encontrando Professores
Na seção "Professores" você pode ver todos os profissionais disponíveis, filtrar por especialidade e agendar diretamente.

---

## ❓ Dúvidas Frequentes

**Posso cancelar uma aula?**
Sim! Acesse seus agendamentos e clique em cancelar. Atenção ao prazo mínimo.

**Meus créditos expiram?**
Depende do pacote. Verifique a validade no momento da compra.

**Posso trocar de professor?**
Sim, você pode agendar com qualquer professor disponível.

---

*Este manual é atualizado regularmente.*`

const docsContent: Record<string, string> = {
    'manual_franqueadora': manualFranqueadora,
    'manual_franquia': manualFranquia,
    'manual_professor': manualProfessor,
    'manual_aluno': manualAluno
}

async function getDocContent(slug: string) {
    const content = docsContent[slug]
    if (!content) return null
    return { content }
}

export default async function DocPage({ params }: DocPageProps) {
    const { slug } = await params
    const doc = await getDocContent(slug)

    if (!doc) {
        notFound()
    }

    const meta: Record<string, string> = {
        'manual_franqueadora': 'Manual da Franqueadora',
        'manual_franquia': 'Manual da Franquia',
        'manual_professor': 'Manual do Professor',
        'manual_aluno': 'Manual do Aluno',
    }

    const title = meta[slug] || slug.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())

    return (
        <FranqueadoraGuard requiredPermission="canViewDashboard">
            <div className="min-h-screen bg-gray-50/50">
                <div className="max-w-4xl mx-auto p-6 space-y-8">
                    <div className="flex items-center gap-4">
                        <Link href="/franqueadora/docs">
                            <Button variant="ghost" size="sm" className="gap-2 pl-0 hover:pl-2 transition-all">
                                <ArrowLeft className="h-4 w-4" />
                                Voltar para Central de Ajuda
                            </Button>
                        </Link>
                    </div>

                    <Card className="border-none shadow-sm bg-white">
                        <CardContent className="p-8 md:p-12">
                            <article className="prose prose-slate prose-lg max-w-none 
                prose-headings:font-bold prose-headings:text-gray-900 
                prose-h1:text-3xl prose-h1:mb-8 prose-h2:text-2xl prose-h2:mt-10 prose-h2:mb-4 prose-h3:text-xl
                prose-p:text-gray-600 prose-p:leading-relaxed
                prose-a:text-meu-primary prose-a:no-underline hover:prose-a:underline
                prose-strong:text-gray-900 prose-strong:font-semibold
                prose-ul:list-disc prose-ul:pl-6 prose-ul:my-4
                prose-ol:list-decimal prose-ol:pl-6 prose-ol:my-4
                prose-li:marker:text-gray-400 prose-li:my-1
                prose-hr:my-8 prose-hr:border-gray-200
                prose-blockquote:border-l-4 prose-blockquote:border-meu-primary/30 prose-blockquote:bg-blue-50 prose-blockquote:py-3 prose-blockquote:px-4 prose-blockquote:rounded-r-lg prose-blockquote:not-italic prose-blockquote:text-gray-700
              ">
                                <ReactMarkdown>
                                    {doc.content}
                                </ReactMarkdown>
                            </article>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </FranqueadoraGuard>
    )
}
