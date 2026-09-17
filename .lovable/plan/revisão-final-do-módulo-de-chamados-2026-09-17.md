# Revisão final do módulo de Chamados

Ajustes de coerência, experiência e permissões nos três perfis. Nada de refazer o módulo: a estrutura atual é mantida e corrigida onde há lacuna.

## 1. Perfis

**Dono e Cliente (solicitantes)** — abrem chamado, acompanham só os próprios, respondem, anexam, reabrem quando resolvido/fechado (janela de 7 dias). Nunca veem notas internas nem alteram situação, prioridade ou responsável.

**Suporte (atendente)** — deixa de ser solicitante: o botão "Abrir chamado" e o item "Chamados" desaparecem do menu dele, e o banco passa a recusar qualquer criação de chamado por conta de suporte, mesmo por chamada direta. Continua com a Caixa completa: responder, assumir, liberar, alterar situação e prioridade, nota interna, anexos, resolver, fechar e reabrir.

## 2. Categorias e prioridades

Categorias passam a ser: Acesso / Login, Calculadora, Histórico, Regina, Relatórios, Conta / Perfil, Erro no sistema, Cobrança / Plano, Outro. Chamados já existentes continuam legíveis.

Prioridades: Baixa, Média, Alta, Crítica (nomes de tela dos quatro níveis já existentes). Solicitante escolhe Baixa, Média ou Alta; Crítica é exclusiva do Suporte.

## 3. Regra de situação (documentada)

Aberto → Suporte assume → Em atendimento → pede informação → Aguardando cliente → **quando o solicitante responde, volta automaticamente para Em atendimento** → Resolvido → Fechado. Reabertura pelo solicitante volta para Aberto. Nenhum estado novo.

## 4. Tela do solicitante

Lista com código amigável, assunto, categoria, prioridade, situação, responsável, criado em, última atualização e marca de nova resposta; filtro por situação e busca por assunto/código; vazio: "Você ainda não abriu nenhum chamado."

Detalhe com todos esses dados, conversa separando solicitante e suporte, anexos, campo de resposta, aviso destacado quando a situação é Aguardando cliente e botão "Reabrir chamado" quando resolvido.

## 5. Caixa do Suporte

Cards: Abertos, Em atendimento, Aguardando cliente, Resolvidos, Alta/Crítica e Não lidos. Filtros de situação, prioridade, categoria, responsável e tipo de solicitante (Dono / Cliente). Busca por nome, e-mail, empresa, assunto ou código.

Lista mostrando código, solicitante com selo Dono/Cliente, empresa, assunto, categoria, prioridade, situação, responsável, última atualização e marca de mensagem nova. Detalhe com o bloco de dados do solicitante (perfil, empresa, e-mail, datas) e as ações de atendimento, incluindo "Solicitar informação" (registra a resposta e coloca em Aguardando cliente).

Vazios: "Nenhum chamado pendente no momento." e "Nenhum chamado corresponde aos filtros selecionados."

## 6. Anexos, não lidos e mensagens de erro

Anexos seguem privados, com link temporário, limite de tamanho e tipos permitidos; será revalidado que ninguém abre anexo de outra conta. Não lidos passam a usar a mesma regra nas duas pontas: destaque quando a última mensagem é da outra parte, e leitura registrada ao abrir o chamado. Erros de banco nunca aparecem crus — mensagens fixas como "Não foi possível carregar os chamados." e "Você não tem permissão para realizar esta ação."

## 7. Dados de demonstração

Os oito chamados `[DEMO]` atuais serão ajustados às novas categorias e complementados para cobrir todas as combinações pedidas. **Não serão apagados.**

## Detalhes técnicos

Banco (uma migração):
- `tickets`: novas colunas `requester_company text` e `requester_role text`, preenchidas na criação e retroalimentadas nos registros atuais a partir de `profiles`/`user_roles`.
- `tickets_insert`: `requester_id = auth.uid() AND NOT has_role(auth.uid(), 'support')`.
- `enforce_ticket_update_rules`: mantém as regras atuais e passa a impedir que o solicitante altere prioridade/responsável (hoje já bloqueia situação).
- `touch_ticket_last_message`: quando o autor é o solicitante e a situação é `aguardando_cliente`, muda para `em_atendimento`.
- Migração de valores de `category` dos chamados existentes para as novas chaves.

Frontend:
- `src/lib/tickets.ts` — novas categorias, rótulos de prioridade (Normal → Média, Urgente → Crítica), `REQUESTER_PRIORITIES`, mensagens de erro padrão.
- `src/hooks/useTickets.tsx` — grava empresa/perfil do solicitante, mensagens amigáveis no lugar de `error.message`, `canCreateTicket`.
- `src/pages/Chamados.tsx` — colunas completas, filtro, busca, vazio novo.
- `src/pages/ChamadoDetalhe.tsx` — responsável, datas, aviso de Aguardando cliente, reabrir.
- `src/pages/SuporteCaixa.tsx` — card Não lidos, filtros de categoria e tipo de solicitante, busca por empresa, selo Dono/Cliente, empresa na lista.
- `src/pages/SuporteChamado.tsx` — bloco de dados do solicitante e ação "Solicitar informação".
- `src/components/tickets/NewTicketDialog.tsx` — prioridades do solicitante, rótulo "Categoria".
- `src/components/AppSidebar.tsx` — suporte sem o item "Chamados".
- `src/components/tickets/TicketThread.tsx`, `TicketBadges.tsx` — separação visual solicitante/suporte e selos.
- `src/pages/DevPerfis.tsx` — documentação das regras.

Fora do escopo: calculadora, fórmulas, Regina, autenticação, recuperação de senha, convites, relatórios e permissões fora dos chamados.

## Validação

Teste ao vivo com as três contas (criar, anexar, responder, reabrir, isolamento entre contas, tentativa direta de criação por suporte recusada, assumir/prioridade/situação/nota interna/fechar/reabrir), conferência em 390 px, 430 px, tablet e desktop, mais testes automatizados, verificação de tipos e build.
