# Estrutura de Dados (Banco de Dados) - Meu Personal

Este documento explica de forma simplificada como as informações são organizadas dentro do sistema Meu Personal. Pense no banco de dados como o "arquivo digital" onde tudo fica guardado.

## Visão Geral

- Nome da unidade, endereço, horário de funcionamento e regras específicas daquela localidade.

### 3. O Negócio (`bookings`, `packages`)
O coração da operação.
- **Agendamentos (Bookings):** O registro de cada aula marcada: quem é o aluno, quem é o professor, onde será a aula, dia, hora e status (confirmada, realizada, cancelada).
- **Pacotes:** Os produtos que são vendidos.
    - *Pacotes de Aulas:* O que o aluno compra para ter direito a treinar.
    - *Pacotes de Horas:* O que o professor adquire para poder usar o espaço (se aplicável).

### 4. Financeiro (`transactions`, `payment_intents`)
O registro do dinheiro.
- **Transações:** O histórico de cada movimentação. Crédito entrando na conta do professor, débito da conta do aluno, pagamento de comissão para a franquia.
- **Intenções de Pagamento:** O registro técnico de quando alguém inicia uma compra online.

### 5. Qualidade (`reviews`)
O feedback dos usuários.
- Notas e comentários que os alunos deixam para os professores após as aulas.

## Como tudo se conecta?

Imagine uma teia onde tudo está ligado:
- Um **Agendamento** liga um **Aluno** a um **Professor** em uma **Unidade**.
- Uma **Transação** liga um **Pagamento** a um **Usuário**.
- Uma **Avaliação** liga um **Aluno** a um **Professor** baseada em um **Agendamento** concluído.

Essa estrutura garante que o sistema saiba exatamente o histórico de cada ação realizada, permitindo relatórios precisos e segurança nas operações.
