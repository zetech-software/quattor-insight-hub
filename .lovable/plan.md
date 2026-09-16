# Corrigir o fluxo de troca obrigatória de senha

Objetivo: a definição da nova senha acontece sempre **depois** do login normal, com sessão válida, e a mensagem técnica "Auth session missing!" nunca aparece para o usuário.

## Situação atual (verificada)

- A tela existe em `/definir-senha` e já está dentro da proteção de rota (exige sessão).
- A obrigação de trocar vem do campo `must_change_password` do perfil, não de e-mail — isso está correto e será mantido.
- A tela mostra hoje o texto de erro cru do serviço quando a atualização falha (é daí que sai "Auth session missing!").
- Ponto frágil encontrado: quando o perfil ainda não foi carregado, a tela é liberada sem confirmar que a sessão está realmente válida no momento de salvar. A causa exata do erro relatado ainda **não está confirmada** — o primeiro passo será reproduzi-la.

## O que será feito

1. **Reproduzir o erro** entrando com uma das contas administrativas e chegando à tela pelo login normal, registrando em que situação a sessão se perde.
2. **Endereço da tela**: passa a ser `/definir-nova-senha`, com o endereço antigo `/definir-senha` redirecionando para o novo (nenhum link quebra).
3. **Confirmar a sessão antes de salvar**: ao clicar em salvar, o sistema revalida a sessão viva; se ela não existir mais, mostra "Sua sessão não está mais válida. Entre novamente para continuar." e leva ao login, sem tentar salvar.
4. **Mensagens amigáveis**: nenhum texto técnico do serviço de autenticação aparece na tela; erros ficam apenas no registro interno.
5. **Bloqueio mantido e reforçado**: com a conta marcada para troca, painel, calculadora, histórico, clientes, relatórios e Regina continuam bloqueados, inclusive por endereço digitado direto; só a troca e o "Sair" funcionam. Deslogado no endereço da troca vai para o login.
6. **Depois da troca**: senha atualizada, marcação desfeita e liberação do destino normal conforme o papel do usuário (painel para administrador).

Nada de link de recuperação por e-mail nesta etapa, nenhuma senha em código, tabela ou navegador, nenhuma mudança nas permissões de administrador/cliente.

## Testes (nesta ordem)

- **A — Proprietário**: sair de qualquer sessão, entrar com a senha temporária, confirmar o redirecionamento automático, definir a nova senha, confirmar entrada no sistema, sair, entrar com a nova senha e confirmar que a tela de troca não volta.
- **B — Suporte**: mesmo fluxo completo.
- **C — Acesso direto deslogado** ao endereço da troca: vai para o login, sem formulário.
- **D — Fuga da troca**: autenticado com a marcação ativa, digitar `/admin` → volta para a tela de troca.
- **E — Sair**: sessão encerrada, F5 continua deslogado, "Voltar" não libera página protegida.
- Ao final: testes automatizados, verificação de tipos e build.

## Detalhes técnicos

- `src/App.tsx`: rota `/definir-nova-senha` com `ProtectedRoute allowPasswordChange`; `/definir-senha` como `Navigate` para a nova.
- `src/pages/DefinirSenha.tsx`: antes de `supabase.auth.updateUser({ password })`, chamar `supabase.auth.getSession()` e abortar com mensagem amigável se não houver `session.user`; remover `error.message` da interface; manter validação de coincidência e mínimo de 6 caracteres (política já usada em `ResetPassword`); manter RPC `clear_must_change_password` + `refreshProfile`; redirecionar por papel.
- `src/components/ProtectedRoute.tsx`: no modo `allowPasswordChange`, aguardar o perfil carregado antes de renderizar o formulário; demais regras de papel intactas.
- Sem alterações em `useAuth.signOut`, banco de dados, migrações, layout, calculadora, histórico, painel, relatórios, clientes ou bundle.

## Observação sobre as senhas de teste

Para executar os cenários A e B é preciso entrar com as senhas temporárias atuais das duas contas administrativas. Se alguma já tiver sido trocada, o teste daquele cenário será feito com uma senha temporária nova definida na hora, e a conta voltará marcada para troca — informarei isso no fim, sem registrar senha em nenhum arquivo.
