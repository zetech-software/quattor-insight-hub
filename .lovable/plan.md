# Primeiro acesso do cliente: auditoria e proposta mínima

Nada foi alterado. Abaixo, como o sistema funciona hoje e o mínimo necessário para chegar ao fluxo descrito.

## Como está hoje

**Quem cria a conta do cliente**
Na tela Clientes, o botão "Convidar Cliente" aparece para Dono, Gestão e Suporte. O serviço que executa também aceita esses três perfis. Cadastro público é fechado: ninguém se cadastra sozinho.

**Como a conta nasce**
1. O sistema usa o convite oficial do serviço de autenticação, informando e-mail, nome e empresa.
2. A permissão `client` é gravada em seguida (obrigatória — se falhar, o Dono/Suporte vê erro).
3. Nome e empresa são salvos no perfil, criado automaticamente na criação da conta.
4. O perfil nasce com "precisa trocar a senha" **desligado**.

**Senha inicial**
Não existe senha temporária. A conta nasce sem senha: o cliente define a dele pelo link do convite, que aponta para a tela de redefinição do sistema.

**"Precisa trocar a senha" existe?**
Sim, é uma marcação no perfil. Quando ligada, qualquer página protegida joga o usuário na tela "Definir nova senha", e só depois de salvar a nova senha o acesso é liberado. Hoje ela só está ligada para as contas internas; clientes convidados nascem com ela desligada.

**Como o cliente recebe o primeiro acesso**
Pelo e-mail de convite do serviço de autenticação, com o remetente padrão atual (sem domínio próprio configurado). O envio não foi validado na prática; se ele falhar, o administrador recebe uma mensagem explícita e nenhum link aparece na tela.

**Cadastro empresarial**
CNPJ, município, UF e telefone não são pedidos em nenhum momento e não bloqueiam nada. O cliente pode preenchê-los em Perfil; o Dono já pode preencher/corrigir pela tela Clientes; o Suporte só visualiza.

## O que falta para o fluxo pedido

| Regra desejada | Situação |
| --- | --- |
| Suporte/Admin cria a conta | já funciona |
| Conta nasce como `client` | já funciona |
| Login vinculado ao e-mail do cliente | já funciona |
| Primeiro acesso seguro | existe via convite, formato final ainda indefinido |
| Trocar a senha no primeiro login | mecanismo existe, mas não é exigido do cliente |
| Concluir cadastro empresarial antes de usar | não existe |
| Dono preenche/corrige cadastro | já funciona |
| Suporte sem plano/permissões | já funciona |

## Implementação mínima proposta

**1. Exigir a troca de senha no primeiro acesso do cliente**
A conta do cliente passa a nascer com a marcação "precisa definir a senha" ligada. Assim, qualquer caminho de entrega (link ou senha entregue pela equipe) cai na mesma tela de definição de senha antes de qualquer uso. Quando o cliente define a senha, a marcação cai.

**2. Nova etapa "Concluir cadastro"**
Depois da senha definida, se faltar responsável, empresa, CNPJ, município, UF ou telefone, o cliente é levado a uma tela única com esses seis campos e não sai dela (só pode sair da conta). Validações iguais às já usadas: CNPJ com 14 números, UF com 2 letras, telefone com DDD. Ao salvar completo, o ambiente normal é liberado. Vale só para cliente — contas internas não passam por isso.

**3. Ordem de liberação**
Senha definida → cadastro completo → calculadora, histórico, Regina e o resto.

**4. Fora desta etapa (como você pediu)**
Domínio de e-mail, remetente, SMTP e o formato final de entrega do primeiro acesso não são decididos nem implementados agora. O fluxo fica pronto para receber qualquer uma das duas formas depois: link de definição de senha ou senha temporária entregue pela equipe.

**5. Nada muda em:** plano, permissões, papéis, fórmulas, histórico, relatórios, Regina, Stripe, e os limites do Suporte permanecem os atuais.

## Detalhes técnicos

- `manage-clients` (ação `invite`): gravar `must_change_password = true` no perfil do cliente criado.
- `ProtectedRoute`: após a checagem de `must_change_password`, nova checagem `needsProfileCompletion` (só quando `role === "client"`) redirecionando para `/completar-cadastro`; a própria rota isenta via prop, como `allowPasswordChange`.
- `useAuth`: `AppProfile` passa a expor `cnpj`, `municipio`, `uf`, `phone` (já existem na tabela) para calcular a pendência.
- Nova página `src/pages/CompletarCadastro.tsx` + rota em `App.tsx`, reaproveitando as validações de `ClientDetailSheet`/`Perfil` (extrair para `src/lib/clientProfileValidation.ts` para uso nos três lugares).
- Gravação pelo próprio cliente na própria linha: a política `profiles_update` já permite; sem migração de banco, sem mudança de RLS ou trigger.
- Testes: suíte automatizada, tipagem, build e verificação no navegador nos três perfis.
