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

- Migração `regina_interactions`: colunas `id`, `user_id`, `created_at`, `question`, `status` (`respondida` | `falha`), `topic`, `origin`; `GRANT` para `authenticated` (select/insert) e `service_role`; RLS com insert `auth.uid() = user_id`, select `auth.uid() = user_id OR has_staff_read_access(auth.uid())`; sem update/delete.
- `src/lib/reginaTopics.ts` (novo): classificação por palavras-chave e rótulos.
- `src/hooks/useRegina.tsx`: grava a interação após enviar (sucesso) e em caso de erro; a lógica do chat, prompt, avatar e integração com IA não mudam.
- `src/components/regina/ReginaFab.tsx` e `src/pages/Regina.tsx`: apenas passam a origem da interação.
- `src/lib/calculationStats.ts` (novo): agregações do resumo do cliente.
- `src/pages/Historico.tsx`: seção de resumo + botões PDF/Excel na linha da tabela (reaproveitando `pdfReports`/`excelReports`).
- `src/pages/AdminRegina.tsx` (novo) + rota `/admin/regina` com `requiredRole` admin/manager/support + item no `AppSidebar`.
- Sem alteração em fórmulas, calculadora, perfil, gestão de clientes, autenticação, exportações existentes, disclaimer, planos ou pagamentos.

## Testes

Cliente: resumo com números conferidos contra o banco, sobras/faltas/sem diferença, período, downloads PDF/Excel, tentativa de ler dados de outro cliente.
Regina: enviar pergunta, conferir registro gravado, conferir que o chat continua respondendo, simular falha.
Dono e Suporte: abrir resumo da Regina, conferir totais, assuntos e perguntas recentes.
Geral: F5, URL direta, logout, 390 px, tema claro/escuro, console e rede limpos. Mais os 99 testes automatizados, verificação de tipos e build de produção.
