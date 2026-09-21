# Cobrança — travas de liberação

A cobrança está tecnicamente preparada, mas **desativada** até a homologação
comercial. Hoje ela depende de **duas liberações independentes**:

1. **`BILLING_ENABLED`** — segredo de ambiente das funções de pagamento.
   Precisa estar definido como `"true"`.
2. **Trava de homologação no código** — constante `BILLING_HOMOLOGATED` em
   `supabase/functions/_shared/stripe.ts`. Precisa estar `true`.

`isBillingEnabled()` só devolve `true` quando **as duas** estão ligadas.
Enquanto qualquer uma estiver desligada:

- `create-checkout` recusa a criação de checkout (nenhuma cobrança é possível);
- `provision-client` recusa o provisionamento automático de cliente;
- `payments-webhook` continua validando assinatura e registrando os eventos em
  `payment_events`, porém **sem criar conta nem liberar assinatura**;
- `/assinatura` permanece acessível em modo informativo (`billingReady: false`,
  botão "Assinatura em breve", sem pagamento).

## Estado atual

- `BILLING_ENABLED`: ligado (`true`) — o segredo foi mantido, nada foi removido.
- `BILLING_HOMOLOGATED`: **desligado (`false`)** — é esta trava que mantém a
  cobrança bloqueada hoje.

## Ao entrar na homologação comercial

Antes de qualquer teste de cobrança, **revisar as duas travas**:

1. Conferir o valor de `BILLING_ENABLED`.
2. Conferir `BILLING_HOMOLOGATED` em `supabase/functions/_shared/stripe.ts` e
   reimplantar as funções de pagamento após qualquer mudança
   (`create-checkout`, `payments-webhook`, `provision-client`, `public-plans`).
3. Só então cadastrar planos com preço e executar os testes em ambiente de teste.
