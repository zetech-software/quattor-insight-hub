# Controle mensal de inserções — Quattor

## Escopo e estado atual

Preparar as correções a partir do PR #4, `fix/stripe-homologation`, revisão examinada `11632231`, sem merge, cobrança real, migração ou deploy em produção. Manter `BILLING_HOMOLOGATED = false` e não alterar `BILLING_ENABLED` ou preços Stripe.

Este chat está na **main**. A cópia do PR em pasta temporária permite inspeção, mas não é uma branch sincronizada para entregar correções. A implementação depende de disponibilizar uma superfície editável isolada da branch do PR.

### Funcionamento conferido

- A calculadora calcula na tela sem gravar; **Salvar** cria uma nova linha em `calculations`, diretamente pela API do banco.
- Cada salvamento usa um novo identificador gerado pelo banco; não há chave de tentativa para impedir duplicação por reenvio.
- `data` é a data do recebimento informada pelo usuário; `created_at` tem padrão `now()`. Nenhuma das duas deve ser aceita do navegador como autoridade do consumo.
- Histórico permite excluir, com confirmação e retorno do banco. Não foi encontrada edição de cálculo na interface; a política atual permite atualizar registros próprios por API.
- O PR verifica acesso genérico à assinatura, mas não limita inserções nem separa Diesel de News. Contar somente linhas existentes permitiria recuperar saldo apagando registros.

## Regras comerciais confirmadas

| Plano | Inserções por mês | Mensal | Anual |
|---|---:|---:|---:|
| Básico | 30 | R$ 100 | R$ 1.000 |
| Intermediário | 100 | R$ 300 | R$ 3.000 |
| Superior | Ilimitadas | R$ 500 | R$ 5.000 |

Consumo individual por cliente; renovação mensal também para assinaturas anuais. Superior não tem teto artificial. Os preços não serão alterados na Stripe.

## Decisões ainda necessárias — não implementar por presunção

As perguntas foram apresentadas, mas não respondidas; as propostas abaixo **não estão aprovadas**. Aprovar este plano não substitui a confirmação destas regras.

1. **Início/fim do mês.** Proposta: mês civil no fuso `America/Sao_Paulo`, do primeiro dia às 00h inclusive até o primeiro dia seguinte às 00h exclusivo; armazenar limites como instantes UTC. Alternativa: aniversário mensal do contrato, com regra explícita para dias 29–31. O ciclo anual de pagamento não define automaticamente esse mês.
2. **Inserção consumida.** Proposta: uma nova linha de cálculo efetivamente gravada/confirmada consome uma unidade. Simulação, exportação, validação com erro e transação revertida não consomem. Reenvio da mesma tentativa não consome novamente; uma nova gravação intencional consome mesmo com NF semelhante.
3. **Edição e exclusão.** Proposta: editar não consome, excluir não devolve saldo; apagar e criar outro cálculo consome uma nova unidade. Nunca editar proprietário, identidade ou referência de consumo para deslocar a cobrança de utilização. Se exclusão puder devolver saldo, definir devolução apenas ao período original e idempotência.
4. **Contratos anteriores e início da ativação.** Definir mapeamento Diesel por cliente, exceções e se registros anteriores à ativação contam no primeiro mês. Se exclusões históricas não forem rastreadas, não é possível reconstruir consumo exato por contagem do histórico.
5. **Trocas/coexistência de planos.** Proposta: não zerar mês nem consumo ao trocar; aplicar teto autorizado do plano vigente, bloqueando novas gravações se consumo já exceder o teto reduzido. Definir qual contrato Diesel prevalece quando houver mais de um; não somar limites ou impor downgrade por presunção. Isso não define prorrata ou regras financeiras de upgrade/downgrade.

## O que construir depois das confirmações

### Direitos por produto e catálogo

- Identificar os nove preços na conexão correta, sem criar duplicatas nem alterar os existentes; vincular valores, periodicidades, modalidade e ambiente aos códigos comerciais.
- Separar direito Diesel, direito Biblioteca News e direito de cada módulo; assinatura News nunca libera calculadora nem invalida contrato Diesel legado.
- Preservar legado conforme mapeamento aprovado e não conceder plano padrão silenciosamente.
- Minicursos: confirmação de pagamento e vencimento fixo exatamente 30 dias depois; negar acesso no vencimento e impedir que webhooks repetidos renovem o prazo. Proteger também o conteúdo servido, não apenas a página.

### Consumo e saldo na tela

- Mostrar na calculadora o plano, consumo, saldo e próxima renovação dentro do layout existente, sem redesenhar outras páginas.
- Básico/Intermediário: valores reais vindos do servidor. Superior: consumo visível e saldo **Ilimitado**, sem máximo fictício.
- No teto: impedir salvar novo registro e mostrar motivo; atualizar consumo após sucesso e após recusa por gravação concorrente. Falha ao consultar consumo não deve aparecer como saldo zero/ilimitado.
- Preservar fórmulas, histórico, exportações, Regina e permissões existentes. Não ampliar poderes do Suporte nem criar outra contratação/cadastro.

## Detalhes técnicos

### Contagem atômica no banco

- Adicionar estrutura de consumo por cliente/período e registro durável de cada inserção consumida, independente da existência futura do cálculo. Novas tabelas com UUID de usuário ou referência permitida a perfil público; grants explícitos e RLS. Cliente não escreve/zera contadores; Suporte não modifica limites.
- Resolver direito Diesel, teto e período no servidor, sem confiar em `user_id`, plano, data, teto ou saldo enviados pelo navegador.
- Serializar gravações do mesmo cliente por lock transacional estável por cliente; toda operação que altere direito/período de consumo deve participar da mesma disciplina de lock. Criar/atualizar contador do período com chave única e incremento condicionado ao teto na mesma transação da inserção.
- Proteger **toda inserção em `calculations` no banco**, incluindo API direta e lotes, com validação/trigger transacional. Uma função de salvamento autenticada pode melhorar idempotência e resposta, mas não pode ser a única guarda enquanto a API direta continuar gravável.
- Tentativa repetida com mesma chave/mesmo conteúdo devolve o resultado original; mesma chave com conteúdo divergente é recusada. A unicidade evita duplicar cálculo e consumo. Rollback desfaz consumo, inclusive se uma linha posterior do lote falhar.
- Fixar instante autorizado de aceitação no servidor após aquisição do lock; usar esse instante para escolher período. Proteger referência de consumo e propriedade contra alterações diretas.
- Superior continua registrando consumo, sem aplicar limite máximo. A renovação usa um novo período lazily, não precisa zerar histórico nem depender de tarefa agendada.
- Expor leitura autenticada de consumo/saldo/limites do período, sem acesso a outro cliente. Preservar ações internas atuais; gravações internas próprias não recebem quotas comerciais de cliente inadvertidamente.

### Testes novos, sem repetir toda a auditoria

- Básico: gravação 30 aceita; 31 recusada. Intermediário: 100 aceita; 101 recusada. Superior: não aplicar teto, inclusive acima de 100.
- Mesma renovação mensal para planos anuais; isolamento entre dois clientes; limites de início/fim do mês escolhido e virada do ano.
- API direta/lotes/reenvio: não burlar limites com data retroativa, `created_at`, troca de proprietário, contador ou plano fornecido pelo cliente.
- Conexões reais concorrentes ao banco isolado: partindo de 29 no Básico, duas gravações simultâneas resultam em exatamente um sucesso e consumo final 30; teste equivalente no Intermediário.
- Erro/rollback não consome; simulação não grava; edição/exclusão seguem a regra finalmente aprovada; repetição idempotente não duplica consumo.
- News não concede Diesel; curso libera somente módulo adquirido e expira exatamente em 30 dias; webhooks repetidos não prorrogam; legado conserva seus direitos aprovados.
- Cliente visualiza consumo atualizado e mensagem de teto; Dono/Suporte mantêm permissões; sem testes de cobrança na prévia atual.

## Sequência e autorizações

1. Confirmar as cinco decisões comerciais acima.
2. Disponibilizar projeto e banco independentes, sem dados/credenciais reais; disponibilizar a branch do PR como destino editável. Conferir isolamento antes de variáveis que liberem testes.
3. Preparar correções de código e testes específicos nessa superfície; apresentar esquema e sequência exata de migrações conforme seu histórico, sem executá-las.
4. Solicitar autorização específica antes de aplicar migrações ou implantar funções **somente no ambiente isolado**.
5. Executar regressões e concorrência, testar consumo pela interface com clientes fictícios e apresentar resultados; manter PR em rascunho até aceite.

**Agora:** somente conferência e plano. Nenhuma implementação de limites, migração, teste de cobrança, alteração Stripe ou publicação.