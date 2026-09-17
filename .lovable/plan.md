# Resumo analítico do cliente e acompanhamento da Regina

## Auditoria (verificada no código e no banco)

- Histórico do cliente: a tela `/historico` já lista os cálculos do próprio cliente, já exporta **PDF individual**, **Excel individual** e **CSV consolidado**. Portanto o item "download de relatórios pelo cliente" já está atendido — não será duplicado. Só será acrescentado um botão de PDF/Excel direto na lista (sem abrir o detalhe), para atalho.
- Não existe hoje nenhuma tela de resumo para o cliente. O resumo será uma seção no topo do próprio Histórico, evitando duplicar navegação.
- Regina: as conversas **não são gravadas em lugar nenhum**. Ficam apenas na memória do navegador e se perdem ao recarregar. A função de servidor da Regina exige sessão válida e não registra nada. Para o Dono acompanhar as dúvidas, é preciso criar um registro novo.
- E-mail transacional: o remetente próprio da Qu4ttuor nunca foi configurado (nenhuma alteração de DNS foi feita). Portanto o envio automático do resumo por e-mail **não será implementado agora**; ficará registrado como pendência.

## 1. Resumo do cliente (no Histórico)

Bloco enxuto no topo de `/historico`, calculado a partir dos cálculos que o cliente já pode ler:

- Total de cálculos
- Sobras / Faltas / Sem diferença (pelo sinal da diferença de volume)
- Volume total conferido (soma do volume atestado; quando ausente, o volume da NF)
- Período dos cálculos (primeira e última data) e data do último cálculo
- Últimos cálculos já aparecem na lista existente logo abaixo

Sem valor financeiro, sem uso da coluna antiga de valor, sem métrica inventada, sem mexer em fórmulas. Cards simples, tema claro/escuro, responsivo em 390 px, 430 px, tablet e desktop.

Observação: para Dono e Suporte, que leem todos os cálculos, o bloco mostra o consolidado que a permissão atual já permite — nenhuma permissão nova.

## 2. Registro das interações da Regina

Nova tabela `regina_interactions`, com o mínimo necessário:

- dono da interação, data/hora
- pergunta enviada (texto do cliente)
- situação da resposta: respondida ou falha
- tema/categoria simples, classificado por palavras-chave do próprio texto (fórmulas, tolerância, seta/diferença, qualidade, uso do sistema, relatórios, outros)
- origem: chat flutuante ou página da Regina

Nada de token, chave, segredo, resposta do modelo ou log técnico.

Regras de acesso: o cliente grava e lê **apenas as próprias** interações; Dono/Gestão/Suporte leem tudo (mesma regra de monitoramento já usada em cadastros e cálculos); o cliente não edita nem exclui, e a atualização da situação da resposta é feita apenas na própria linha.

Regras de comportamento do registro:

- Falha ao registrar nunca interrompe nem invalida a conversa: a Regina continua respondendo normalmente.
- Cada mensagem enviada pelo usuário gera **no máximo um registro**.
- A situação só passa a "respondida" quando a resposta da Regina termina de verdade com sucesso.
- Se a resposta falhar ou for interrompida, a mesma linha passa a "falha" — nunca se cria uma segunda linha para a mesma pergunta.
- Erro de gravação fica só em registro técnico seguro, sem nenhuma mensagem para o usuário.

Proteção no próprio banco (não só na tela): depois de criada, a interação só aceita uma mudança de situação. Qualquer tentativa do usuário de alterar a pergunta, o dono da linha, a data, o assunto, a origem ou o identificador é recusada pelo banco. E a situação só pode sair de "pendente" para "respondida" ou "falha" — uma interação já finalizada não pode ser adulterada depois.

## 3. Resumo da Regina para o Dono

Nova página "Regina (uso)" no grupo Administração, visível para Dono, Gestão e Suporte:

- Total de interações, interações com falha, clientes distintos
- Assuntos mais frequentes
- Clientes que mais usaram
- Perguntas recentes (com data, cliente e assunto)
- Filtro de período (7, 30, 90 dias e tudo) e estado vazio claro

Sem dashboard exagerado, seguindo o desenho atual.

## 4. Envio por e-mail

Não será implementado neste bloco. Relatório final informará: "Envio por e-mail pendente de configuração do serviço transacional."

## Detalhes técnicos

- Migração `regina_interactions`: colunas `id`, `user_id`, `created_at`, `question`, `status` (enum `regina_interaction_status`: `pendente` | `respondida` | `falha`, padrão `pendente`), `topic`, `origin`; `GRANT` select/insert/update para `authenticated` e `ALL` para `service_role`; RLS com insert e update em `auth.uid() = user_id`, select `auth.uid() = user_id OR has_staff_read_access(auth.uid())`; sem delete.
- Trigger `BEFORE UPDATE` `enforce_regina_interaction_update_rules` (SECURITY DEFINER, `search_path = public`): quando `auth.uid() = OLD.user_id` e o autor não tem acesso administrativo, força `id`, `user_id`, `created_at`, `question`, `topic` e `origin` de volta aos valores antigos, e levanta exceção se `OLD.status <> 'pendente'` ou se `NEW.status NOT IN ('respondida','falha')`. Ou seja: só a transição `pendente → respondida` e `pendente → falha` passa; linha finalizada é imutável.
- `src/lib/reginaTopics.ts` (novo): classificação por palavras-chave e rótulos.
- `src/hooks/useRegina.tsx`: no envio, cria uma única linha `pendente` e guarda o id; ao concluir a resposta com sucesso atualiza para `respondida`; em erro ou interrupção atualiza a mesma linha para `falha`. Toda gravação roda isolada em `try/catch` com `console.error` apenas, sem afetar o fluxo do chat, sem toast e sem repetir a linha em reenvio da mesma pergunta (o "Tentar novamente" cria uma nova interação, porque é uma nova tentativa do usuário). Prompt, avatar e integração com IA não mudam.
- `src/components/regina/ReginaFab.tsx` e `src/pages/Regina.tsx`: apenas passam a origem da interação.
- `src/lib/calculationStats.ts` (novo): agregações do resumo do cliente.
- `src/pages/Historico.tsx`: seção de resumo + botões PDF/Excel na linha da tabela (reaproveitando `pdfReports`/`excelReports`).
- `src/pages/AdminRegina.tsx` (novo) + rota `/admin/regina` com `requiredRole` admin/manager/support + item no `AppSidebar`.
- Sem alteração em fórmulas, calculadora, perfil, gestão de clientes, autenticação, exportações existentes, disclaimer, planos ou pagamentos.

## Testes

Cliente: resumo com números conferidos contra o banco, sobras/faltas/sem diferença, período, downloads PDF/Excel, tentativa de ler dados de outro cliente.
Regina: enviar pergunta e conferir uma única linha gravada; conferir que ela vira "respondida" só ao fim da resposta; simular falha de resposta e conferir que a mesma linha vira "falha"; simular falha de gravação e conferir que a conversa segue normal e sem mensagem de erro para o usuário.
Segurança da tabela, por chamada direta ao banco com a conta do cliente: alterar a própria pergunta → recusado; alterar o dono da linha → recusado; trocar "respondida" por "falha" depois de finalizada → recusado; alterar data, assunto, origem ou identificador → recusado; e o fluxo normal da Regina continua saindo de "pendente" para a situação final corretamente.
Dono e Suporte: abrir resumo da Regina, conferir totais, assuntos e perguntas recentes.
Geral: F5, URL direta, logout, 390 px, tema claro/escuro, console e rede limpos. Mais os 99 testes automatizados, verificação de tipos e build de produção.
