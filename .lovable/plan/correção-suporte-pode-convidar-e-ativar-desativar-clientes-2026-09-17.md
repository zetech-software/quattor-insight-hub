# Correção: Suporte pode convidar e ativar/desativar clientes

Ajuste apenas dessa permissão. Nada mais é alterado: Caixa de chamados, Cliente e Dono ficam como estão.

## O que o Suporte passa a poder

- Ver a lista de clientes (já podia)
- Convidar novo cliente
- Ativar cliente
- Desativar cliente

## O que continua bloqueado para o Suporte

- Alterar plano/assinatura
- Alterar permissão ou promover usuário
- Qualquer ação sobre contas Dono ou Suporte (inclusive ativar/desativar)
- Excluir conta definitivamente
- Excluir cálculos
- Configurações sensíveis

Regra obrigatória: o Suporte só age sobre contas com perfil de cliente. Isso vale na tela e também no servidor — se alguém tentar por fora da interface, o servidor recusa.

## Detalhes técnicos

`supabase/functions/manage-clients/index.ts`:
- Aceitar o perfil `support` como chamador autorizado (hoje só `admin` e `manager`).
- Ações permitidas ao support: `invite` e `toggle-active`. `update-subscription` continua exclusiva do admin.
- Endurecer a verificação do alvo: para quem não é admin, `toggle-active` só passa se o alvo tiver o papel `client` e nenhum papel de equipe (`admin`, `manager`, `support`) — hoje a checagem olha só `admin`/`manager`.
- Convite continua criando a conta sempre com papel `client`.

`src/pages/AdminClientes.tsx`:
- `canManageClients` passa a incluir `support`, liberando o botão "Convidar Cliente" e o menu de ativar/desativar. O submenu de planos continua só para admin.

Banco: sem migração. A escrita direta em `profiles`, `user_roles` e `subscriptions` continua fechada para o support; as ações passam pela função de servidor, que aplica a regra.

`src/pages/DevPerfis.tsx`: atualizar as duas linhas de permissão do Suporte.

## Testes

Support convidando cliente; desativando e reativando cliente; tentativa de desativar Dono recusada; tentativa de desativar outro Suporte recusada; plano recusado; alteração de permissão recusada; exclusão definitiva recusada. Mais os 99 testes automatizados, verificação de tipos e build.
