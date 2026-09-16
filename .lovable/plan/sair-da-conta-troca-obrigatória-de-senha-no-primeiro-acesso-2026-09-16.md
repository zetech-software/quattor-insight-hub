# Sair da conta + troca obrigatória de senha no primeiro acesso

Dois ajustes apenas, sem tocar em cálculo, Regina, histórico, relatórios, clientes ou permissões.

## 1. Botão "Sair" encerrando a sessão de verdade

O diagnóstico exato ainda não está confirmado, então o primeiro passo é reproduzir a falha no navegador (entrar, clicar em Sair, usar Voltar, atualizar a página e digitar uma URL administrativa), observando o que acontece de fato.

O que já é visível no código e será endereçado:

- a saída não trata falha do encerramento de sessão: se ele der erro, o restante não acontece e o usuário continua dentro;
- a ida para a tela de entrada usa navegação normal, o que deixa a página protegida no histórico do navegador e permite voltar para ela.

Correção:

- encerrar a sessão de forma tolerante a erro, sempre limpando o estado local e qualquer resíduo de sessão guardado pelo navegador;
- levar para a tela de entrada substituindo a página no histórico, para que "Voltar" não retorne a uma área protegida;
- garantir que, após sair, atualizar a página ou digitar qualquer endereço protegido leve à tela de entrada.

## 2. Primeiro acesso com senha temporária

Fluxo novo: quem entra com senha temporária só consegue definir a nova senha (ou sair). Painel, calculadora, histórico, clientes, relatórios e Regina ficam bloqueados até a troca, inclusive por endereço digitado direto.

- Nova tela "Definir nova senha" em `/definir-senha`: nova senha + confirmação, verificação de coincidência e a mesma exigência mínima já usada no projeto (ao menos 6 caracteres).
- Depois da troca, a marcação cai e o acesso segue normal conforme o papel do usuário.
- Quem já definiu a própria senha pelo convite ou pela recuperação não é obrigado a trocar.
- As duas contas administrativas atuais serão marcadas como precisando trocar a senha no próximo acesso.
- Nenhuma senha é gravada, registrada, exibida ou guardada em qualquer lugar; a marcação indica apenas a obrigação de trocar.

## Detalhes técnicos

- Banco: nova coluna `must_change_password boolean not null default false` em `public.profiles`; `update` marcando `true` para as duas contas administrativas atuais. Função `security definer` `public.clear_must_change_password()` que zera a marcação apenas para `auth.uid()`, com `grant execute` para `authenticated` (a política `profiles_update` já permite auto-atualização, então isso não amplia privilégio; a função apenas mantém a escrita explícita e auditável).
- `manage-clients` (ação `invite`): novos clientes recebem `must_change_password = false`, pois definem a própria senha pelo e-mail de definição.
- `src/hooks/useAuth.tsx`: `profile` passa a expor `must_change_password`; `signOut` envolvido em `try/finally`, limpando o estado local e usando `scope: "local"` como garantia quando o encerramento remoto falhar.
- `src/components/AppSidebar.tsx`: `navigate("/login", { replace: true })`.
- `src/components/ProtectedRoute.tsx`: quando a marcação estiver ativa, redireciona para `/definir-senha`; a própria tela de troca fica fora desse bloqueio.
- Nova página `src/pages/DefinirSenha.tsx` + rota em `src/App.tsx`, reusando o padrão visual de `ResetPassword.tsx`; usa `supabase.auth.updateUser({ password })` e depois chama a função de limpeza da marcação e recarrega o perfil.
- `src/integrations/supabase/types.ts` é regerado automaticamente pela migração.

## Testes

- Sair como proprietário, suporte e cliente; Voltar; atualizar a página; endereço administrativo direto.
- Primeiro acesso das duas contas administrativas: redirecionamento obrigatório, tentativa de abrir `/admin` antes da troca, senhas diferentes, senha curta, troca bem-sucedida, novo acesso com a senha nova sem pedir troca de novo, e sair depois da troca.
- Suíte automatizada completa, verificação de tipos e build de produção.
