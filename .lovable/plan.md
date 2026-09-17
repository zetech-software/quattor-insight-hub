# Remoção completa do módulo de Chamados

Sai do sistema toda a área de chamados/atendimento. A conta e o perfil de Suporte continuam existindo, com os mesmos acessos de monitoramento que têm hoje.

## O que desaparece

- Menu: "Chamados" (Dono e Cliente) e "Caixa de chamados" (Suporte), incluindo o contador de mensagens não lidas.
- Telas: lista de chamados, detalhe do chamado, caixa do Suporte e detalhe na caixa.
- Ações: abrir chamado, responder, nota interna, assumir, situação, prioridade, responsável, anexos, filtros, busca e cartões de resumo.
- Endereços diretos `/chamados`, `/chamados/:id`, `/suporte` e `/suporte/:id` deixam de existir: quem digitar cai na página de "não encontrado".
- Dados de demonstração dos chamados (todos os `[DEMO]`), mensagens, notas internas e o anexo de exemplo.
- Área privada de anexos de chamados (usada só por esse módulo).

## O que continua igual

- Calculadora, fórmulas, histórico, painel, clientes, relatórios, planos, login, logout, recuperação e troca obrigatória de senha, convites.
- Regina: mesma página, mesmo avatar, mesmas respostas. Não há hoje nenhum botão dela que leve para chamados, então nada muda ali.
- Suporte: conta `suporte@qu4ttuor.com.br` e perfil `support` mantidos. Continua entrando e vendo painel, clientes, relatórios, calculadora, histórico e Regina; continua podendo convidar cliente e ativar/desativar conta de cliente; continuam bloqueadas as ações do Dono (planos, permissões, promoções, exclusões, contas administrativas).
- Cliente e Dono seguem exatamente como estão, apenas sem a opção de chamados.

## Detalhes técnicos

Arquivos removidos: `src/pages/Chamados.tsx`, `src/pages/ChamadoDetalhe.tsx`, `src/pages/SuporteCaixa.tsx`, `src/pages/SuporteChamado.tsx`, `src/components/tickets/` (AttachmentPicker, NewTicketDialog, TicketBadges, TicketThread), `src/hooks/useTickets.tsx`, `src/lib/tickets.ts`.

Arquivos alterados:
- `src/App.tsx` — remove as 4 rotas e imports.
- `src/components/AppSidebar.tsx` — remove itens de chamados, badge de não lidas e o `useUnreadTicketCount`; o Suporte passa a ver o mesmo menu do Dono.
- `src/components/ProtectedRoute.tsx` — remove o desvio para `/suporte`; `support` continua liberado nas rotas administrativas.
- `src/pages/DevPerfis.tsx` — retira as linhas de chamados do quadro de perfis.

Banco (uma migração), removendo só o que é exclusivo do módulo:
- Tabelas `tickets`, `ticket_messages`, `ticket_attachments`, `ticket_reads` com suas políticas e triggers.
- Funções `has_support_access`, `is_ticket_participant`, `enforce_ticket_update_rules`, `touch_ticket_last_message`.
- Tipos `ticket_status` e `ticket_priority`.
- Políticas de storage `ticket_attachments_storage_select` e `ticket_attachments_storage_delete`; arquivos e bucket `ticket-attachments`.
- Mantidos intactos: `has_staff_read_access` (dá ao Suporte a leitura de perfis, cálculos, papéis e planos — é o que sustenta o monitoramento), `has_role`, `has_admin_area_access`, o enum `app_role` com o valor `support` e a função `manage-clients` (convite e ativar/desativar cliente).
- Como o banco não permite apagar tabelas sem confirmação explícita, essa etapa aparece para você aprovar antes de rodar.

Depois: regeneração dos tipos do banco, limpeza de imports órfãos, testes automatizados, verificação de tipos e build, e teste ao vivo nos três perfis (Dono, Suporte e Cliente) confirmando que nenhuma rota de chamados abre e que nenhum acesso do Suporte foi perdido.
