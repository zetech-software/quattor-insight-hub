# Preparação das contas oficiais de produção

Objetivo: deixar apenas a conta administrativa oficial, remover contas e dados de teste, e garantir que todo cliente convidado receba automaticamente a permissão de cliente.

## 1. Conferência antes de excluir (somente leitura)

Antes de apagar qualquer coisa, listar tudo que está ligado às duas contas a remover:
cálculos, perfil, permissão, assinatura. Se aparecer qualquer registro que não seja
claramente de teste, essa exclusão não é executada e o caso é informado a você.

Também será conferido que os 6 cálculos existentes pertencem de fato à conta
administrativa oficial e são os registros de desenvolvimento já identificados.

## 2. Conta mantida

`admin@qu4ttuor.com.br` permanece como administradora oficial, com permissão de
administrador, perfil ativo e acesso a painel, clientes e relatórios. Nenhuma senha
nova será definida, registrada em código, em documento ou nesta conversa — a troca
será feita pelo próprio titular pelo fluxo de "esqueci minha senha" da tela de entrada.

## 3. Contas removidas

- `teste@qu4ttuor.com.br` — conta de teste de cliente: permissão, perfil, assinatura e registro de acesso.
- `admin@quattuor.com` — administrador duplicado com domínio incorreto: permissão, perfil, assinatura e registro de acesso.

## 4. Dados de teste removidos

- Os 6 cálculos de teste da conta oficial, para que o histórico comece vazio e o painel mostre zero cálculos com os estados vazios corretos dos gráficos.
- Apenas as assinaturas em avaliação ligadas às contas removidas. Nenhuma assinatura ou plano novo será criado.

## 5. Permissão automática de cliente

Hoje o convite oficial cria o usuário e envia o e-mail de definição de senha, mas não
grava nenhuma permissão — o cliente nasce sem papel. Passará a receber `cliente`
automaticamente no momento do convite.

Permanecem inalterados: administração baseada em papel, a função de segurança que
valida permissões no banco, as políticas de acesso, o bloqueio de contas inativas e a
criação automática de perfil. Nenhuma permissão será decidida por e-mail.

## 6. Cadastro público

Confirmar que o cadastro aberto continua indisponível e que clientes só entram pelo
convite feito por um administrador, definindo a própria senha.

## 7. Verificações obrigatórias depois da limpeza

Entrada da conta administrativa; painel; clientes; relatórios; calculadora; histórico
vazio; Regina; abertura do convite de cliente sem concluir operação destrutiva
desnecessária; permissão automática de cliente; cliente sem acesso à área
administrativa; visitante deslogado indo para a tela de entrada; cadastro público
fechado. Mais os testes automatizados, a verificação de tipos e o build de produção.

## Detalhes técnicos

- Exclusões via SQL de dados (não migração): `DELETE` em `calculations`, `subscriptions`, `user_roles`, `profiles` e depois em `auth.users` para os dois e-mails, na ordem das dependências.
- Auditoria prévia com `SELECT` por `user_id` nas quatro tabelas.
- `supabase/functions/manage-clients/index.ts`: após `createUser` no `action === "invite"`, inserir `{ user_id, role: 'cliente' }` em `user_roles` com `upsert`/`on conflict do nothing`; falha nessa inserção retorna erro claro em vez de criar cliente sem permissão. Redeploy da função.
- Sem alterações em `handle_new_user`, `has_role`, RLS, grants ou qualquer outra tabela.
- Nenhuma alteração de layout, calculadora, histórico, painel, relatórios ou bundle.

## Fora de escopo

Senhas novas, contas adicionais, otimização de bundle, itens pendentes de acabamento
(acessibilidade, botão da Regina no celular, coluna VCT do histórico, performance).
