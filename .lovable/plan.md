# Segunda conta administrativa oficial (suporte)

Objetivo: criar `suporte@qu4ttuor.com.br` como segunda administradora oficial, mantendo
`admin@qu4ttuor.com.br` como conta do proprietário. Nenhuma senha será inventada,
exibida ou gravada em qualquer lugar.

## Situação atual verificada

Existe hoje uma única conta: `admin@qu4ttuor.com.br`, com permissão de administrador e
perfil ativo. Nenhum cálculo, nenhuma assinatura.

## O que será feito

1. Criar a conta `suporte@qu4ttuor.com.br` com senha temporária aleatória gerada apenas
   no servidor, nunca registrada nem mostrada.
2. Atribuir a permissão de administrador a essa conta na tabela de permissões.
3. Garantir perfil criado, nome "Suporte Qu4ttuor" e perfil ativo.
4. Enviar o e-mail de definição de senha para `suporte@qu4ttuor.com.br`, para que a
   própria equipe defina a senha.
5. Não criar cálculos, assinaturas de avaliação nem dados de exemplo.
6. Conta do proprietário permanece exatamente como está; a troca de senha dela continua
   pelo fluxo de "Esqueci minha senha" na tela de entrada.

## Verificações depois da criação

Entrada das duas contas administrativas; painel; clientes; relatórios; calculadora;
Regina; F5 dentro das páginas administrativas; acesso direto pelas URLs administrativas;
sair; visitante deslogado indo para a tela de entrada; cliente sem acesso à área
administrativa. Mais os testes automatizados, a verificação de tipos e o build de
produção.

## Detalhes técnicos

- Criação via Admin API (`auth.admin.createUser` com `email_confirm: true`) executada no
  servidor, senha temporária de `crypto.randomUUID()` descartada.
- `INSERT` em `public.user_roles` com `{ user_id, role: 'admin' }` (`on conflict do nothing`).
  Permissão exclusivamente por `user_roles` — nenhuma checagem por e-mail.
- Perfil vem do gatilho `handle_new_user`; ajuste apenas de `full_name` via `UPDATE`.
- E-mail de definição de senha via `auth.admin.generateLink` (tipo `recovery`) apontando
  para `/reset-password`.
- Sem migração de schema, sem mudança em RLS, grants, `has_role`, `handle_new_user`,
  Edge Functions, layout ou qualquer código do app.

## Fora de escopo

Senhas registradas em qualquer lugar, clientes existentes, calculadora, Regina,
histórico, relatórios, layout, otimização de bundle, itens de acabamento pendentes.

## Relatório final

Conta do proprietário, conta de suporte, permissão das duas, status ativo, resultado dos
testes, da tipagem e do build — sem nenhuma senha, token ou chave.
