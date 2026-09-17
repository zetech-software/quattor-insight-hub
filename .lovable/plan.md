# Suporte com a mesma visão do Dono + Caixa de chamados melhorada

O perfil Suporte passa a navegar pelas mesmas telas do Dono, mas continua sem poder executar ações de propriedade. A Caixa de chamados fica mais rica e informativa. A lógica dos chamados não muda.

## 1. Páginas que o Suporte passará a acessar

- Painel (dashboard administrativo)
- Clientes (lista completa, somente leitura)
- Relatórios
- Calculadora
- Histórico (de todos os clientes, somente leitura)
- Regina (assistente, incluindo o botão flutuante)
- Caixa de chamados (continua como hoje)

O menu do Suporte passa a mostrar os mesmos grupos do Dono, mais o item "Caixa de chamados".

## 2. Ações que continuam bloqueadas para o Suporte

- Alterar perfil/permissão de qualquer conta
- Promover alguém a administrador
- Convidar novo cliente
- Ativar ou desativar contas
- Excluir conta, perfil, chamado ou cálculo
- Alterar plano/assinatura
- Qualquer configuração crítica reservada ao proprietário

Na tela de Clientes, os botões de convite, ativar/desativar e plano ficam ocultos para o Suporte. Além da interface, o banco e a função de administração continuam recusando essas ações mesmo se alguém tentar por fora da tela.

## 3. Melhorias na Caixa de chamados

- Cards de resumo: abertos, em atendimento, aguardando cliente, resolvidos, alta/crítica
- Filtros mais visíveis (situação, prioridade, responsável) com contagem do resultado
- Busca por nome do cliente, e-mail, assunto ou código do chamado
- Lista com cliente identificado, responsável, prioridade, situação e última atualização
- Destaque claro para chamados com nova resposta do cliente
- Conversa melhor organizada na tela do chamado, com notas internas visualmente separadas e anexos identificados (nome e tamanho)
- Layout responsivo: cartões no celular, tabela no computador

Nenhuma regra de chamado muda: quem pode assumir, priorizar, responder, fechar e reabrir continua igual.

## 4. Arquivos e regras alteradas

Banco (uma migração):
- Nova função `has_staff_read_access(uuid)` = admin, manager ou support.
- Trocar para essa função apenas as políticas de LEITURA de `profiles`, `calculations`, `user_roles` e `subscriptions`.
- `profiles_update`, `profiles_delete`, `user_roles_*` de escrita, `subscriptions_admin_all`, `calculations_delete` e `tickets_delete` permanecem exatamente como estão (sem support).

Frontend:
- `src/components/ProtectedRoute.tsx` — support passa a ser aceito nas rotas administrativas e deixa de ser redirecionado para `/suporte`.
- `src/components/AppSidebar.tsx` — menu do support = itens de cliente + administração + caixa de chamados.
- `src/components/AppLayout.tsx` — Regina liberada para support.
- `src/App.tsx` — `/chamados` e rotas administrativas incluindo `support`.
- `src/pages/AdminClientes.tsx` — esconder convite, ativar/desativar e plano para support.
- `src/pages/SuporteCaixa.tsx` e `src/pages/SuporteChamado.tsx` — melhorias visuais descritas acima.
- `src/components/tickets/*` — ajustes de badges/anexos conforme necessário.
- `src/pages/DevPerfis.tsx` — atualizar a documentação dos perfis.

Depois: testes automatizados, verificação de tipos, build e conferência ao vivo com as três contas.
