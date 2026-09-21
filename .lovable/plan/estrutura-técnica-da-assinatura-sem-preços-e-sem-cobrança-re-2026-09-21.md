# Estrutura técnica da assinatura (sem preços e sem cobrança real)

Objetivo: deixar a plataforma pronta para receber planos, checkout e liberação automática
de cliente depois que os donos aprovarem preços e a forma de entrega da credencial.
Nada de dinheiro real, nada publicado, nenhum valor inventado.

## 1. O que já existe hoje (conferido)

- Conta de pagamentos ligada ao projeto apenas em modo de teste (sandbox).
- Nenhum plano e nenhum preço cadastrados lá: a lista de produtos está vazia.
- Dois avisos automáticos de pagamento (webhooks) já criados pela plataforma, ambos em
  modo de teste, cobrindo compra concluída, pagamento confirmado, pagamento recusado e
  assinatura criada/alterada/cancelada. Nenhum código no sistema recebe esses avisos ainda.
- Nenhuma função de cobrança, checkout ou portal existe no sistema.
- Tabela de assinaturas atual guarda somente: usuário, situação, nome do plano, início,
  vencimento e datas de registro. Não guarda nada de identificação do pagamento nem
  periodicidade nem ambiente.
- Convite de cliente pela equipe já funciona, já grava a permissão de cliente e já obriga
  a definição de senha; a tela "Concluir cadastro" com os seis campos obrigatórios já
  bloqueia calculadora, histórico e Regina até o cadastro ficar completo.
- Risco de misturar teste e produção: existe, porque hoje nada registra o ambiente do
  pagamento. É o que a mudança de banco resolve.

## 2. O que será reaproveitado

Convite/criação de conta, permissão exclusiva de cliente, troca obrigatória de senha,
tela de conclusão cadastral e todas as regras de acesso de Dono, Gestão, Suporte e
Cliente. Nada disso muda de comportamento.

## 3. O que será criado

**Catálogo de planos** — nova tabela de planos com identificador interno, nome,
descrição, periodicidade, identificadores do provedor de pagamento, ambiente
(teste/produção) e ativo/inativo. Nasce vazia: nenhum plano, nenhum preço.
O sistema passa a ler preço e nome sempre do catálogo, nunca do código.

**Página pública de assinatura** — nova página em `/assinatura`, fora da área logada,
sem link no menu do sistema. Estrutura pronta para cards de plano com nome, descrição,
recursos, escolha mensal/anual, preço vindo do catálogo, botão "Assinar" e destaque de
plano recomendado. Hoje, com o catálogo vazio, ela mostra só a apresentação da
plataforma e o aviso "Planos em definição — estamos preparando as opções de assinatura
da Qu4ttuor. Os planos e condições comerciais serão disponibilizados em breve.", sem
nenhum botão de pagamento ativo. Nenhum preço no código.

Os planos são carregados por uma função pública de leitura que devolve apenas planos
ativos do ambiente atual e somente os campos comerciais (código, nome, descrição,
recursos, periodicidade, preço e moeda). Ela nunca devolve identificadores do provedor,
segredos, dados de cliente ou informação administrativa; a tabela de planos em si não
fica aberta para visitante. Quando os planos forem aprovados, o botão "Assinar" passa a
chamar a função de checkout com o código do plano, e o resto do fluxo (pagamento
confirmado, criação da conta, primeiro acesso, cadastro obrigatório) já estará pronto.


**Função de checkout (preparada, desligada)** — recebe só o identificador interno do
plano, busca preço e ambiente no catálogo no servidor, recusa plano inativo ou de outro
ambiente, e hoje responde "cobrança ainda não homologada" enquanto a chave de liberação
estiver desligada. A chave secreta de pagamento nunca vai para o navegador.

**Função de recebimento de avisos de pagamento (preparada)** — valida a assinatura de
cada aviso, registra o evento uma única vez (evento repetido é ignorado) e reconhece
compra concluída, pagamento confirmado, pagamento recusado, assinatura criada,
atualizada, cancelada e renovada. Enquanto a homologação não terminar, ela apenas
registra o evento sem criar conta nem alterar cobrança.

**Função de provisionamento de cliente (preparada, desligada)** — a partir de um evento
válido: usa o e-mail confirmado na compra, cria a conta, cria/vincula o cadastro,
atribui exclusivamente a permissão de cliente e vincula a assinatura. Se o e-mail já
existir, não duplica: apenas vincula a assinatura. Nunca aceita permissão vinda da
compra. A entrega da credencial fica como ponto de extensão, sem e-mail, sem remetente
e sem senha em texto aberto.

**Situação do plano para o cliente** — na conta do cliente, plano e assinatura continuam
somente leitura, agora preenchidos a partir do catálogo quando existir.

## 4. Mudanças no banco (exatamente isto)

1. Nova tabela `subscription_plans`: código interno, nome, descrição, periodicidade
   (mensal/anual), produto e preço do provedor, ambiente (`test`/`production`), ativo.
   Leitura liberada para quem está autenticado; criação/alteração só para Dono.
2. Colunas adicionadas em `subscriptions`, todas opcionais: periodicidade, identificador
   do cliente no provedor, identificador da assinatura, produto, preço, início e fim do
   período atual, data de cancelamento, ambiente. `plan_name` e os dados atuais
   permanecem intactos.
3. Nova tabela `payment_events`: identificador do evento (único), tipo, ambiente, dados
   recebidos, data de processamento. Sem acesso pelo aplicativo — só pelo servidor.
4. Nenhum dado apagado, nenhuma política existente enfraquecida, nenhuma alteração em
   `profiles`, `user_roles`, `calculations` ou nos gatilhos já existentes.

## 5. Arquivos afetados

- Novas funções de servidor: `create-checkout`, `payments-webhook`, `provision-client`.
- Nova migração de banco em `supabase/migrations/`.
- Novo módulo de leitura do catálogo e nova página pública de assinatura em `src/`.
- Ajuste pontual em `src/pages/Perfil.tsx` e no detalhe do cliente para exibir a
  assinatura a partir do catálogo quando houver.
- Nenhuma alteração em fórmulas, calculadora, histórico, relatórios, Regina ou permissões.

## 6. Detalhes técnicos

- Chave de liberação por segredo de ambiente (`BILLING_ENABLED`, padrão desligado);
  checkout e provisionamento verificam essa chave antes de qualquer efeito.
- Ambiente é derivado de `livemode` do evento e conferido contra o do plano; evento de
  ambiente diferente é rejeitado e registrado.
- Idempotência por `unique` no identificador do evento em `payment_events`.
- Webhook sem verificação de JWT (`verify_jwt = false` em `config.toml` só para ela);
  as demais mantêm verificação.
- Provisionamento usa a chave de serviço apenas no servidor, com permissão fixa `client`.
- Fecho com testes automatizados, verificação de tipos, build e teste em sandbox.

## 7. Fica aguardando decisão dos donos

Nomes e preços dos planos, desconto anual, período de teste, tolerância de
inadimplência, bloqueio por falta de pagamento, upgrade/downgrade, cancelamento, portal
do cliente, domínio/remetente de e-mail e o formato final de entrega do primeiro acesso.
