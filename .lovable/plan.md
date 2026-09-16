# Convite de cliente: enviar o e-mail de verdade

## O que já está confirmado no código

No serviço de convite (`supabase/functions/manage-clients/index.ts`, ação `invite`) o fluxo hoje é:

1. cria a conta com uma senha temporária aleatória (nunca exibida) e e-mail já confirmado;
2. atribui a permissão de cliente;
3. grava nome e empresa no perfil;
4. **gera** um link de definição de senha e descarta o resultado, sem verificar erro.

Gerar o link não é o mesmo que enviar o e-mail, e o retorno nem é conferido. Também confirmei que a tela de definição de senha (`src/pages/ResetPassword.tsx`) só aceita links do tipo "recuperação"; um link de convite cairia em "Link inválido ou expirado". Ainda assim, o envio real será verificado na prática antes de qualquer correção.

## Passo 1 — Teste real do convite (antes de mudar nada)

Conta temporária: **enzo@zeregistra.com.br**.

Pelo painel de administração, convidar essa conta e conferir: conta criada, perfil criado, permissão de cliente, e-mail recebido na caixa real, senha definida pelo link, primeiro acesso, acesso à calculadora, histórico apenas próprio, Regina respondendo, bloqueio de painel/clientes/relatórios (inclusive por endereço digitado), sair, F5 e novo acesso.

Se o e-mail chegar, nada é alterado e o relatório registra que o problema não existia.

## Passo 2 — Correção (somente se o e-mail não chegar)

O convite passa a usar o **mecanismo oficial de convite por e-mail** do serviço de autenticação: a conta é criada já com o envio do convite, sem senha temporária, e o cliente define a senha ao aceitar.

- Se o envio falhar, o administrador vê uma mensagem clara ("Não foi possível enviar o convite por e-mail. Verifique o endereço e tente novamente.") e a conta não fica pela metade — nome, empresa e permissão de cliente só são concluídos após a criação bem-sucedida; se a permissão falhar, o erro continua explícito.
- Nenhuma senha temporária, token ou link aparece em tela, resposta ou registro interno.
- A tela de definição de senha passa a aceitar também o link de convite, mostrando "Definir sua senha" nesse caso.
- Cadastro público continua fechado e a permissão de cliente continua automática.

Se o problema for apenas de configuração do envio de e-mails do projeto (e não do código), a configuração é ajustada e isso é informado no relatório.

## Passo 3 — Limpeza e validação

Apagar completamente a conta temporária: cálculos, assinatura, permissão, perfil e a própria conta; depois confirmar por consulta que nada sobrou. Em seguida: 89 testes automatizados, verificação de tipos e build de produção.

## Fora de escopo (não será tocado)

Status periódico de conta desativada, mensagens técnicas da gestão, e-mail/permissão na listagem, plano Trial/Básico, nome do proprietário, permissões brutas das tabelas e avisos do console.

## Detalhes técnicos

- `supabase/functions/manage-clients/index.ts` (ação `invite`): substituir `createUser` + `generateLink({type:"recovery"})` por `auth.admin.inviteUserByEmail(email, { data: { full_name, company_name }, redirectTo: \`${origin}/reset-password\` })`, com checagem de erro (`already been registered` → 409; falha de envio → 502 com mensagem amigável); manter o `upsert` em `user_roles` com `{ role: "client" }` e o `update` do perfil depois do convite aceito pelo serviço.
- `src/pages/ResetPassword.tsx`: aceitar `type=invite` além de `type=recovery` no hash, e título condicional.
- `src/pages/AdminClientes.tsx`: apenas o texto de sucesso, se necessário ("Convite enviado para ...").
- Sem migração de banco; a remoção da conta de teste é feita por SQL na ordem `calculations` → `subscriptions` → `user_roles` → `profiles` → conta de autenticação.
- Verificar `check_email_domain_status` antes de concluir causa de falha de envio, para distinguir código de configuração.
