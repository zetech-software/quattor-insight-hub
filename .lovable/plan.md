# Opção B — Área de Chamados e perfil Suporte

Objetivo: criar um perfil de suporte técnico separado, com uma área de chamados própria, sem dar a ele nenhum poder administrativo. O perfil `manager` continua existindo, reservado para gestão interna futura.

## Como cada perfil fica

| Perfil | O que vê |
|---|---|
| Dono (admin) | Tudo que já vê hoje + abre chamados e acompanha os seus |
| Suporte (support) | Somente a caixa de chamados. Nada de painel, clientes, relatórios, planos ou exclusões |
| Cliente (client) | Calculadora, histórico, Regina + abre chamados e acompanha os seus |
| Gestão (manager) | Sem mudança (permanece reservado) |

## Novas telas e endereços

- `/chamados` — lista dos chamados do próprio usuário (dono e cliente), com botão "Abrir chamado".
- `/chamados/:id` — conversa do chamado, com anexos e histórico.
- `/suporte` — caixa de entrada do suporte: todos os chamados, filtros por situação, prioridade e responsável.
- `/suporte/:id` — atendimento do chamado.

Menu: "Chamados" aparece para dono e cliente; "Suporte" aparece somente para suporte (e para o dono, para conferência).

## Regras dos chamados

- Situação: aberto, em atendimento, aguardando cliente, resolvido, fechado.
- Prioridade: baixa, normal, alta, urgente (quem abre escolhe; suporte pode ajustar).
- Responsável: um usuário de suporte assumindo o chamado.
- Mensagens: quem abriu e o suporte trocam mensagens; o suporte pode registrar nota interna, invisível ao cliente.
- Anexos: entram na primeira versão (imagens e PDF, até 10 MB cada, máximo 5 por mensagem), guardados em área privada.
- Quem pode fechar: o suporte e o dono. O cliente pode reabrir dentro de 7 dias.
- Notificações visuais: contador de mensagens não lidas no menu e marcação nos itens da lista.
- Estados vazios, mensagens de erro claras com "Tentar novamente" e layout responsivo em todas as telas.

## Detalhes técnicos

### Banco (migração)

1. `ALTER TYPE app_role ADD VALUE 'support'`.
2. `public.tickets`: `id`, `requester_id`, `assigned_to`, `subject`, `category`, `priority`, `status`, `last_message_at`, `closed_at`, `created_at`, `updated_at`.
3. `public.ticket_messages`: `id`, `ticket_id` (FK cascade), `author_id`, `body`, `is_internal bool default false`, `created_at`.
4. `public.ticket_attachments`: `id`, `message_id` (FK cascade), `ticket_id`, `storage_path`, `file_name`, `mime_type`, `size_bytes`, `created_at`.
5. `public.ticket_reads`: `user_id`, `ticket_id`, `last_read_at` (contador de não lidas).
6. Enums novos: `ticket_status`, `ticket_priority`.
7. GRANT em cada tabela: `SELECT, INSERT, UPDATE` para `authenticated` (DELETE só em anexos/mensagens do próprio autor), `ALL` para `service_role`. Sem `anon`.
8. Funções `security definer`: `has_support_access(_uid)` (support ou admin) e `is_ticket_participant(_uid, _ticket_id)`.
9. Trigger para `updated_at` e para atualizar `last_message_at`.

### RLS

- `tickets` SELECT: `requester_id = auth.uid() OR has_support_access(auth.uid())`.
- `tickets` INSERT: `requester_id = auth.uid()` (dono e cliente abrem para si).
- `tickets` UPDATE: autor pode alterar assunto/reabrir; `has_support_access` pode alterar situação, prioridade e responsável. Sem DELETE por cliente; exclusão apenas admin.
- `ticket_messages` SELECT: participante do chamado ou suporte; mensagens com `is_internal = true` só para `has_support_access`.
- `ticket_messages` INSERT: participante do chamado ou suporte; `author_id = auth.uid()`; `is_internal` só permitido a suporte/admin.
- `ticket_attachments`: espelha as regras das mensagens.
- `ticket_reads`: cada usuário só lê/grava a própria linha.
- Nenhuma política nova em `calculations`, `profiles`, `subscriptions` ou `user_roles`. Suporte não passa a ler dados de cálculo nem clientes; vê apenas o nome de quem abriu o chamado, incluído em coluna própria do ticket (`requester_name`, gravada na criação) para não precisar de acesso a `profiles`.

### Armazenamento de anexos

Bucket privado `ticket-attachments`, caminho `ticket_id/message_id/arquivo`. Políticas de storage permitem upload/leitura apenas a participantes do chamado e ao suporte. Downloads sempre por URL assinada de curta duração. Sem bucket público.

### Bloqueio de áreas administrativas

`ProtectedRoute` hoje libera qualquer rota para `admin`. Será ajustado para: `support` nunca satisfaz `requiredRole` de `["admin","manager"]`, e para `support` a rota inicial passa a ser `/suporte` (redirecionamento de `/`, `/historico`, `/regina`, `/admin/*`). A função `has_admin_area_access` não incluirá `support`.

### Arquivos alterados/criados

- Alterados: `src/App.tsx` (rotas), `src/components/AppSidebar.tsx` (menus por perfil), `src/components/ProtectedRoute.tsx` (regras de acesso), `src/hooks/useAuth.tsx` (tipo `AppRole` + `support`), `src/pages/DevPerfis.tsx` (novo perfil no roteiro de testes).
- Criados: `src/pages/Chamados.tsx`, `src/pages/ChamadoDetalhe.tsx`, `src/pages/SuporteCaixa.tsx`, `src/pages/SuporteChamado.tsx`, `src/hooks/useTickets.tsx`, `src/components/tickets/*` (formulário, lista, thread, anexos, badges de situação/prioridade).

### Função de servidor

Não é necessária para a primeira versão: criação, mensagens e anexos funcionam com RLS + URL assinada. `manage-clients` não é tocada. Caso depois se queira e-mail de aviso de novo chamado, entra como função separada.

## Validação

- Testes de isolamento: cliente A não lê chamado do cliente B; cliente não lê nota interna; suporte não lê `calculations` nem `profiles` de clientes; suporte recebe redirecionamento em `/admin`, `/admin/clientes`, `/admin/relatorios`.
- Conta temporária de suporte criada para os testes, com role `support`, usada para validar caixa de entrada, resposta, mudança de situação, atribuição e anexo.
- Rodar a suíte de testes, verificação de tipos e build antes de encerrar.

## Migração da conta suporte@qu4ttuor.com.br

Somente depois de a área de chamados estar validada: trocar a role de `manager` para `support` em uma única operação, confirmar que o login cai em `/suporte` e que `/admin` fica bloqueado, e então remover a conta temporária de teste.

## Riscos de regressão e rollback

- Riscos: mudança em `ProtectedRoute` pode afetar dono/cliente; novo valor no enum de perfis não pode ser removido depois; menus podem exibir item errado por perfil.
- Mitigação: testes de acesso para os quatro perfis antes da migração da conta oficial.
- Rollback: reverter a role de suporte@ para `manager`, ocultar os itens de menu e as rotas de chamados; as tabelas novas ficam isoladas e não afetam cálculos, clientes ou relatórios.
