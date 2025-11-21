# Arquitetura do Sistema - Meu Personal


### 2. O Cérebro (Backend - API)
É a parte invisível que processa todas as regras.
- **Tecnologia:** Node.js com Express.
- **Função:** Quando você clica em "Agendar", é o Backend que verifica se o professor está livre, se você tem saldo, e confirma a operação.
- **Segurança:** Garante que apenas pessoas autorizadas acessem determinados dados.

## Onde Ficam os Dados? (Infraestrutura)

### Banco de Dados e Autenticação (Supabase)
Usamos o **Supabase**, uma plataforma de nível mundial para guardar seus dados.
- **Segurança:** Seus dados são criptografados.
- **Login:** Gerencia senhas e acessos com padrões de segurança da indústria.
- **Backup:** Seus dados são salvos automaticamente para evitar perdas.

### Pagamentos (Integração ASAAS)
Para lidar com dinheiro, não reinventamos a roda. Integramos com o **ASAAS**, uma plataforma especializada em pagamentos.
- Isso garante que os dados de cartão de crédito e transações bancárias sejam processados com segurança máxima, sem passar diretamente pelos nossos servidores.

## Como Funciona na Prática?

1. **Você clica:** No seu celular, você pede para agendar uma aula.
2. **Frontend envia:** O aplicativo manda uma mensagem segura para o nosso Backend.
3. **Backend processa:** O "cérebro" verifica as regras e consulta o Banco de Dados.
4. **Resposta:** O sistema confirma o agendamento e atualiza sua tela em milésimos de segundo.

## Escalabilidade (Crescimento)

O sistema foi desenhado para crescer.
- Se amanhã você tiver 10x mais alunos, a arquitetura permite aumentar a capacidade dos servidores sem precisar reconstruir o sistema.
- O código é modular (separado em blocos), o que facilita adicionar novas funcionalidades (como um Chat ou Nutrição) no futuro sem quebrar o que já existe.
