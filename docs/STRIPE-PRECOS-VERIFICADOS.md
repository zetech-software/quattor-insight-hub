# Qu4ttuor — catálogo Stripe verificado (consulta somente leitura)

Consulta em 10/11/2026 à conta Stripe **Qu4ttuor** `acct_1UGjr2C9Hplquc9G`, **modo live**.
Os três produtos e nove preços abaixo estão ativos, em BRL. Os identificadores de produto e preço não são credenciais. **Nenhum produto, preço ou configuração Stripe foi alterado.**

| Produto / faixa | Periodicidade | Valor | Stripe product ID | Stripe price ID |
|---|---|---:|---|---|
| Calculadora Diesel — Básico, 30/mês | mensal | R$ 100,00 | `prod_VZDoUZuw5DcTNL` | `price_1UY5NFC9Hplquc9Gv3tImZJA` |
| Calculadora Diesel — Básico, 30/mês | anual | R$ 1.000,00 | `prod_VZDoUZuw5DcTNL` | `price_1UY5OkC9Hplquc9GwHMz9oOQ` |
| Calculadora Diesel — Intermediário, 100/mês | mensal | R$ 300,00 | `prod_VZDoUZuw5DcTNL` | `price_1UY5OkC9Hplquc9G5MDSknOn` |
| Calculadora Diesel — Intermediário, 100/mês | anual | R$ 3.000,00 | `prod_VZDoUZuw5DcTNL` | `price_1UY5OkC9Hplquc9G8D5I139D` |
| Calculadora Diesel — Superior, ilimitado | mensal | R$ 500,00 | `prod_VZDoUZuw5DcTNL` | `price_1UY5OkC9Hplquc9GlE5oVraF` |
| Calculadora Diesel — Superior, ilimitado | anual | R$ 5.000,00 | `prod_VZDoUZuw5DcTNL` | `price_1UY5OkC9Hplquc9GPpuuWqS5` |
| Biblioteca News | mensal | R$ 10,00 | `prod_VZDckPYXzty0kz` | `price_1UY5B4C9Hplquc9GHG64Bdh6` |
| Biblioteca News | anual | R$ 100,00 | `prod_VZDckPYXzty0kz` | `price_1UY5BaC9Hplquc9GFs7TZx64` |
| Minicurso Qu4ttuor — módulo | pagamento único | R$ 15,00 | `prod_VZDrmh5DnUOKvj` | `price_1UY5PlC9Hplquc9Gn8X4Os5j` |

**Regras confirmadas:** limites Diesel renovados no primeiro dia de cada mês, inclusive assinatura anual; plano Superior sem limite; minicurso com prazo de 30 dias conforme a política comercial.

**Estado de integração:** a conexão Stripe live consultada possui os valores acima, mas a tabela `public.subscription_plans` consultada anteriormente estava vazia. A conta Stripe Sandbox do Lovable estava vazia e não é a conta live acima. **Não executar seed destes IDs de produção no Sandbox.** Primeiro provisionar catálogo de teste com preços de teste próprios e obter aprovação do mapeamento, migrações e implantação.

**Atenção:** produto, preço e periodicidade devem ser validados juntos. O mesmo produto Stripe Diesel representa três faixas com dois preços cada. Não deduzir o limite apenas do ID do produto. Cada módulo de minicurso exige código de acesso próprio, ainda que compartilhe o mesmo preço unitário de R$ 15,00.
