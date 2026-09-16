# Senhas temporárias das duas contas administrativas

Objetivo: definir uma senha temporária forte e diferente para cada conta administrativa
e entregá-las a você uma única vez, para repasse aos responsáveis.

## Situação atual verificada

Existem exatamente duas contas, as duas com permissão de administrador e perfil ativo:
`admin@qu4ttuor.com.br` e `suporte@qu4ttuor.com.br`.

## O que será feito

1. Gerar duas senhas aleatórias distintas, com 20 caracteres, misturando maiúsculas,
   minúsculas, números e símbolos, sem nome da empresa, e-mail, "admin", "suporte", ano
   ou qualquer padrão previsível.
2. Aplicar cada senha à respectiva conta pelo mecanismo administrativo seguro do
   serviço de autenticação.
3. Conferir a entrada real de cada conta na tela de acesso, com a nova senha.
4. Conferir que as duas seguem administradoras, com perfil ativo, e que painel,
   clientes, relatórios, calculadora, histórico e Regina continuam acessíveis.
5. Apresentar as duas credenciais uma única vez no relatório final desta conversa.

## Onde as senhas NÃO ficarão

Nenhum arquivo do projeto, nenhuma configuração pública, nenhum README, nenhuma
migração, nenhum registro de log. As senhas existirão apenas no serviço de autenticação
(guardadas de forma criptografada) e no relatório final desta conversa.

## Aviso importante

Como as senhas passarão por esta conversa, elas devem ser tratadas como temporárias:
cada responsável precisa trocar a própria senha no primeiro acesso, pelo fluxo de
redefinição de senha.

## Detalhes técnicos

- Geração local com fonte aleatória criptográfica; nenhuma senha é impressa em saída de
  comando nem gravada em arquivo do repositório.
- Aplicação via `auth.admin.updateUserById` (endpoint administrativo `PUT /auth/v1/admin/users/{id}`),
  executada no ambiente do servidor com a chave de serviço lida de variável de ambiente.
- Nenhum outro campo das contas é tocado: e-mail, confirmação, metadados, `user_roles`
  e `profiles.is_active` permanecem como estão.
- Validação de entrada por navegador automatizado com `signInWithPassword` pela própria
  tela de acesso, mais navegação nas rotas administrativas e F5.
- Sem alteração de código, schema, RLS, grants, `has_role`, Edge Functions ou layout.

## Fora de escopo

Qualquer outra mudança no sistema.
