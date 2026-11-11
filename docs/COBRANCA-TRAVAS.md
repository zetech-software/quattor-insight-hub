# Cobrança Quattor

## Travas e ambientes

Produção exige simultaneamente `BILLING_HOMOLOGATED` e `BILLING_ENABLED`.
A primeira trava permanece em `false`. O Checkout recusa pedidos, e o webhook
devolve HTTP 503 para eventos relevantes autenticados enquanto o processamento
estiver desabilitado. Assim uma entrega pendente pode ser reenviada pela Stripe.

Para homologação, implante a mesma revisão em um projeto Supabase isolado.
Configure `BILLING_SANDBOX_PROJECT_REF` com a referência desse projeto. A função
só aceita a configuração se a referência corresponder a `SUPABASE_URL` e for
diferente de `rqaiodukllvnrxojhbwq`. Nesse projeto, só o ambiente Stripe
`sandbox` é aceito. O Checkout confere a modalidade, o produto, o preço e o
modo do objeto Stripe antes de criar uma sessão. Nenhuma trava comercial
precisa ser alterada para homologar.

## Configuração

| Nome | Uso |
| --- | --- |
| `LOVABLE_API_KEY` | Autenticação do gateway Lovable |
| `STRIPE_SANDBOX_API_KEY` | Conexão Stripe de teste no gateway |
| `PAYMENTS_SANDBOX_WEBHOOK_SECRET` | Assinatura do destino do sandbox |
| `STRIPE_LIVE_API_KEY` | Conexão Stripe de produção no gateway |
| `PAYMENTS_LIVE_WEBHOOK_SECRET` | Assinatura do destino de produção |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Runtime das funções |
| `SUPABASE_PUBLISHABLE_KEY` ou `SUPABASE_ANON_KEY` | Validação da sessão nas funções que usam o cliente autenticado |
| `PAYMENTS_RETURN_ORIGINS` | Origens HTTPS exatas, separadas por vírgula. Obrigatório no sandbox. Em produção, o padrão é `https://quattor-insight-hub.lovable.app` |
| `BILLING_SANDBOX_PROJECT_REF` | Exclusivo do projeto de teste |
| `BILLING_ENABLED` | Trava comercial de produção. Preservar a configuração até a aprovação |

Cadastre um único destino de eventos do tipo snapshot em cada conta/ambiente,
com versão da API `2026-03-25.dahlia`. Reutilize o destino se ele já existir.
O endpoint valida o corpo bruto e a assinatura da Stripe.

- Produção: `https://rqaiodukllvnrxojhbwq.supabase.co/functions/v1/payments-webhook?env=live`
- Sandbox: `https://<ref-do-projeto-isolado>.supabase.co/functions/v1/payments-webhook?env=sandbox`

Eventos esperados:

- `checkout.session.completed`, `checkout.session.expired`,
  `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`
- `customer.subscription.created`, `customer.subscription.updated`,
  `customer.subscription.deleted`, `customer.subscription.paused`,
  `customer.subscription.resumed`
- `invoice.paid`, `invoice.payment_failed`

## Roteiro de homologação

1. Confira o histórico de migrações e faça backup. Aplique a migração nova
   com Supabase. Ela também aceita bases nas quais Drizzle 0005/0006 já foram
   aplicadas. Em uma base limpa, use a cadeia Supabase para o schema de
   pagamentos. Não reaplique Drizzle 0005/0006 sobre o schema já criado.
2. Publique `create-checkout`, `payments-webhook`, `public-plans`,
   `provision-client`, `pet-chat` e a interface da mesma revisão no ambiente
   isolado. A migração deve preceder as funções e a interface.
3. Use uma conta de cliente existente, com e-mail confirmado e perfil ativo.
   Confira os vínculos do catálogo de teste por código e ambiente, o tipo
   `subscription` ou `payment`, o produto e o preço Stripe correspondentes.
4. Faça o checkout dos dois tipos. Confira o evento entregue, a linha em
   `stripe_contracts` e o acesso ao produto da conta correta. Um minicurso
   pago cria direito consultável por `has_stripe_access(código)`. Conecte
   essa checagem ao servidor que entrega o conteúdo do curso.
5. Para assinatura, valide renovação, falha, pagamento após falha, cancelamento
   imediato, cancelamento no fim do período e expiração. Sem carência aprovada,
   `past_due` suspende o acesso. Dois contratos do mesmo cliente coexistem.
6. Reenvie um evento concluído, interrompa uma tentativa e reenvie um evento
   antigo após uma renovação. Confira `payment_events.attempts`, o status
   final e a linha do contrato. Se o processamento ficar pendente após uma
   interrupção, a concessão de 90 segundos expira e o reenvio pode assumir.
7. Compare a revisão publicada com a aprovada e faça o aceite do fluxo no
   sandbox antes de qualquer mudança comercial.

Testes de regressão em ambiente descartável:
`deno test --allow-env supabase/tests/stripe_flows_test.ts` e
`psql -v ON_ERROR_STOP=1 -f supabase/tests/stripe_contracts.sql`.

Contratos legados permanecem disponíveis na tabela original. A interface
administrativa legada continua exibindo esse cadastro. Faça a reconciliação
dos contratos legados Stripe com o catálogo antes do corte, se existirem.
Trocas de produto/preço no mesmo contrato, estornos e disputas exigem regra
comercial e tratamento próprios. Cadastre o destino de produção somente
no ponto do roteiro operacional em que esteja pronto para receber eventos.
