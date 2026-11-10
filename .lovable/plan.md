# Ambiente isolado para homologação Stripe

## Resultado da verificação

É possível preparar **outro projeto Lovable com Lovable Cloud independente e vazio**, sem modificar a aplicação atual. Nada foi criado nesta verificação.

- A ferramenta disponível para criar drafts informa que eles usam o banco de produção: **não utilizar drafts deste projeto para pagamentos**.
- A documentação informa que projetos com pagamentos integrados habilitados **não podem ser remixed**. Portanto, Remix não é a opção para este projeto.
- A alternativa documentada é **importar um ZIP do código em um novo projeto**, sem dados, usuários ou credenciais. A importação está em disponibilização gradual; se o administrador não tiver esse menu, esta alternativa não está disponível para sua conta.
- Não foi identificado um ambiente isolado disponível nesta sessão. A busca de outros projetos acessíveis não certifica a inexistência de ambientes externos ou não compartilhados.

## Plano proposto — somente após autorização

### 1. Preparar a revisão sem tocar na produção

- Consultar novamente o HEAD do PR #4 antes da preparação e registrar sua revisão exata; última revisão verificada: `11632231e8bd04e750dc696098cc723d83bf9baf`, branch `fix/stripe-homologation`.
- Preparar ZIP limpo dessa revisão, excluindo `.git` em qualquer nível, `.jj`, arquivos `.env*`, dependências, builds, exportações de dados e credenciais.
- Inspecionar referências ao backend original, URLs de funções, integrações e chaves incorporadas. Não transportar conexões de produção; preservar apenas a identificação necessária à proteção que recusa o backend de produção, sem utilizá-la como destino.
- Não fazer merge, mudar a branch sincronizada do projeto principal ou sobrescrever alterações existentes.

### 2. Administrador cria o projeto separado

- No dashboard: **+ → Import project to Lovable → Upload code**. Importar apenas o ZIP inspecionado.
- Nome sugerido: **Quattor Insights — Homologação**. Manter sem publicação e com acesso restrito à equipe autorizada.
- Não fornecer exportações de clientes, Auth, banco ou armazenamento. Não preencher pedidos de credenciais da produção que a importação possa apresentar.
- Confirmar que o projeto novo possui Lovable Cloud próprio; autorizar sua criação e escolher a região, se solicitado.
- Antes de qualquer teste, confirmar que o banco é independente, está vazio e que a aplicação/funções apontam somente para ele. A importação não garante automaticamente que todo destino antigo seja substituído.
- Se o menu de importação não existir: o administrador pode criar um projeto vazio com Lovable Cloud próprio; a transferência do código poderá ser feita no chat desse projeto, após aprovação de um plano específico. Não conectar o repositório existente esperando importar sua branch: Git sync cria um repositório novo, não vincula um existente.

### 3. Stripe de teste independente

- No chat **do novo projeto**, habilitar os pagamentos integrados do Lovable com Stripe, mediante autorização do administrador.
- Usar o sandbox criado para esse novo projeto. Não reutilizar a conexão atual, copiar chaves do projeto original ou conectar uma conta live.
- Não concluir go-live, criar webhooks live, configurar banco de recebimento nem publicar.
- Confirmar que o webhook da aplicação de teste aponta para o backend novo. Preservar o endpoint separado de analytics do Lovable; não deduplicar esses dois destinos legítimos.
- Os segredos gerenciados devem ser provisionados pelo próprio fluxo de pagamentos do novo projeto. Se o fluxo não disponibilizar uma conexão sandbox independente, interromper a preparação e informar o impedimento; não improvisar copiando segredos.

### 4. Configuração e esquema — aprovação separada antes de executar

- Preservar `BILLING_HOMOLOGATED = false`.
- Não alterar `BILLING_ENABLED` no projeto atual nem no novo; não copiar seu valor. O caminho isolado do PR deve funcionar sem depender dessa alteração.
- Configurar apenas no ambiente novo a identificação exclusiva do backend de teste e suas origens HTTPS permitidas.
- Inspecionar novamente o histórico das migrações e explicar a sequência exata antes de pedir autorização para aplicá-las ao banco novo. Não reaplicar Drizzle 0005/0006 depois da cadeia equivalente.
- Criar somente usuários fictícios e dados sintéticos após autorização. Nenhuma conta original será copiada.
- Não criar produtos/preços nesta etapa. O catálogo de teste precisa ser disponibilizado ou autorizado posteriormente, sem inventar condições comerciais.

### 5. Critério de ambiente pronto

- Projeto separado e banco independente/vazio confirmados.
- Código da revisão aprovada do PR identificado; nenhuma alteração no PR ou merge.
- Conexão Stripe sandbox própria e webhook apontando para o banco isolado.
- Nenhum caminho de execução direcionado à produção.
- Travas comerciais preservadas e projeto sem publicação.
- Só então planejar correções pendentes do PR e testes integrados; não repetir agora Vitest, Deno ou SQL já aprovados.

## Configurações técnicas necessárias no projeto novo

| Configuração | Origem e finalidade |
| --- | --- |
| Backend, chave pública e credenciais de runtime próprias | Provisionadas pelo Lovable Cloud novo; nunca copiar do original |
| `BILLING_SANDBOX_PROJECT_REF` | Identifica exclusivamente o backend novo; o PR valida correspondência com seu runtime e recusa produção |
| `PAYMENTS_RETURN_ORIGINS` | Apenas origens HTTPS reais e autorizadas do ambiente novo; não inventar domínio |
| `STRIPE_SANDBOX_API_KEY` | Conexão gerenciada criada pelo fluxo Stripe no projeto novo |
| `PAYMENTS_SANDBOX_WEBHOOK_SECRET` | Provisionado para o webhook do projeto novo pelo fluxo gerenciado |
| `LOVABLE_API_KEY` | Chave própria gerenciada do projeto novo, sem transferência da original |
| `BILLING_HOMOLOGATED` | Mantido `false` no código |
| `BILLING_ENABLED` | Não alterar nem copiar; não é a liberação do caminho isolado do PR |

Nenhuma chave live é necessária para homologação. Não solicitar nem divulgar valores de segredos.

## Autorizações, custos e limites

- **Esta aprovação é do plano**, não autoriza automaticamente recursos pagos, alteração de conexões ou execução de migrações. Cada uma dessas etapas terá autorização própria antes da ação.
- O administrador com permissão para criar projetos precisa iniciar a importação/novo projeto. Configurar pagamentos integrados exige proprietário ou administrador de projeto/workspace e plano Pro ou superior, segundo a documentação.
- Importação, trabalho do agente e uso do Lovable Cloud podem consumir créditos/uso. Não foi verificado o plano ou saldo deste workspace, nem estimado um valor fixo. Confirmar condições exibidas antes de autorizar recursos.
- Este chat só pode configurar o projeto em que está aberto; não instala o código nem altera conexões de outro projeto. Após a criação, abrir o chat do ambiente de homologação para continuar nele.
- Não há garantia de isolamento pela mera aparência de uma cópia: verificar o destino efetivo do banco e de todas as integrações antes de liberar testes.

## Referências oficiais

- [Importar projeto](https://docs.lovable.dev/features/projects/import-project)
- [Remix e limitações](https://docs.lovable.dev/features/projects/remix#what-carries-over)
- [Lovable Cloud](https://docs.lovable.dev/features/cloud)
- [Pagamentos integrados](https://docs.lovable.dev/features/payments)

**Estado atual:** nenhum recurso, conexão, secret, banco, migração, produto, preço ou publicação foi alterado; produção preservada.