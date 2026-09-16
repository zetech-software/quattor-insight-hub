# Perfis e ambientes — guia de teste

Três perfis reais existem no sistema: `admin`, `manager` (Gestão) e `client`.
Nenhuma senha é registrada neste documento nem em qualquer arquivo do projeto.

Página de apoio (só em desenvolvimento): `/dev/perfis`. Ela não faz login,
não guarda senha e não altera permissões — apenas indica a conta e as rotas.

## Admin — admin@qu4ttuor.com.br (`admin`)

Rotas: `/admin`, `/admin/clientes`, `/admin/relatorios`, `/`, `/historico`, `/regina`.

Vê tudo e pode executar ações sensíveis: convidar cliente, ativar/desativar qualquer
conta, alterar plano e assinatura, excluir contas e cálculos, alterar permissões.

## Gestão — suporte@qu4ttuor.com.br (`manager`)

Rotas: `/admin`, `/admin/clientes`, `/admin/relatorios`, `/`, `/historico`, `/regina`.

Pode: ver painel, clientes e relatórios; convidar cliente; ativar/desativar cliente.

Não pode: alterar plano/assinatura, excluir contas ou cálculos, alterar permissões,
nem executar qualquer ação sobre conta Admin ou Gestão. Os bloqueios valem também
no servidor (função `manage-clients` e políticas do banco), não só na tela.

## Cliente — enzo@zeregistra.com.br (`client`)

Rotas: `/`, `/historico`, `/regina`.

Bloqueadas: `/admin`, `/admin/clientes`, `/admin/relatorios` — digitadas na barra de
endereço, devolvem para a calculadora. O menu não mostra bloco administrativo e o
banco entrega somente os dados da própria conta.

## Roteiro de teste

1. Sair da sessão atual.
2. Entrar em `/login` com a conta do perfil.
3. Conferir o menu, abrir cada rota liberada e digitar as bloqueadas na barra de endereço.
4. Em `/admin/clientes`, abrir o menu de ações de uma linha: Admin mostra Desativar,
   Plano Básico e Plano Premium; Gestão mostra apenas Desativar.
