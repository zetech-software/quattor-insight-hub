# Convites com remetente oficial Qu4ttuor

## Situação atual (auditada, nada foi alterado)

- O projeto **não tem remetente próprio**: os convites saem hoje pelo remetente padrão da plataforma, compartilhado. É por isso que a entrega do convite anterior não pôde ser comprovada.
- O fluxo administrativo de convite (Gestão de Clientes) está correto e **não será alterado**.
- Não existe nenhuma senha, chave ou credencial de e-mail no projeto.
- O domínio `qu4ttuor.com.br` não está registrado como domínio de envio deste projeto.

## Escopo confirmado

- Remetente: `noreply@qu4ttuor.com.br`, nome exibido "Qu4ttuor Consultoria".
- Subdomínio de envio: `notify.qu4ttuor.com.br`.
- **Nada é alterado** no DNS principal, MX, caixas existentes ou propriedade do domínio.
- **Sem transferência** do domínio e **sem trocar os nameservers do domínio principal**.
- A delegação fica restrita exclusivamente ao subdomínio `notify.qu4ttuor.com.br`.

## Registros DNS que você vai adicionar

Só entram registros **no nome `notify`** — nenhuma linha existente é editada ou removida.

| Tipo | Nome / host | Finalidade |
|---|---|---|
| NS | `notify` (ou `notify.qu4ttuor.com.br`) | Delega apenas esse subdomínio ao serviço de envio, que passa a manter SPF, DKIM e MX de envio dentro dele |
| NS | `notify` (segunda entrada) | Segundo servidor de nomes, exigido para redundância |

Os valores exatos dos dois servidores de nomes são gerados na hora da configuração e serão exibidos para você conferir e copiar **antes** de qualquer alteração. Não invento nem preencho esses valores.

Observações importantes:
- O MX do `qu4ttuor.com.br` (recebimento das caixas atuais) **não é tocado**. O envio automático passa a usar `notify.qu4ttuor.com.br`, que hoje não existe e não conflita com nada.
- SPF, DKIM e DMARC do envio ficam dentro do subdomínio delegado, mantidos automaticamente. Nenhum SPF ou DMARC do domínio raiz é modificado.
- Se o painel do domínio não permitir criar registros do tipo NS, paramos e reavaliamos — sem transferência de domínio.

## Passo a passo

1. Abrir a configuração de e-mail e informar `notify.qu4ttuor.com.br`.
2. Conferir na tela os dois registros NS e copiá-los para o painel do domínio.
3. Aguardar a verificação (normalmente minutos; pode levar até 72 h).
4. Definir remetente `noreply@qu4ttuor.com.br` e nome "Qu4ttuor Consultoria" nos e-mails de autenticação (convite, definição e recuperação de senha).
5. Enviar um convite real para um endereço seu pelo fluxo oficial.
6. Acompanhar o registro de envio até confirmar a saída sem erro.
7. Você confirma o recebimento, o remetente exibido e o link.
8. Definir a senha pelo link, entrar como cliente, confirmar calculadora e histórico próprios e o bloqueio das páginas administrativas.
9. Apagar a conta usada no teste.

O fluxo só é considerado aprovado após o item 8.

## Riscos

- Enquanto o subdomínio não estiver verificado, os convites continuam saindo pelo remetente padrão. Nada piora.
- Uma delegação de subdomínio digitada errada afeta apenas `notify.` — o site, as caixas e o recebimento seguem intactos.
- Convites já enviados pelo remetente antigo não são reenviados automaticamente.

## Detalhes técnicos

- Nenhuma alteração em `supabase/functions/manage-clients/index.ts`, contas, permissões, telas ou regras de cálculo.
- Após a verificação, é criada a infraestrutura de envio do projeto (fila, log de envio, supressão e cancelamento de inscrição) e os e-mails de autenticação passam a ser renderizados por templates próprios, com registro de fila, envio, rejeição e reclamação — o que hoje não existe.
- Os templates de convite/definição de senha manterão a identidade visual atual do sistema.
- SMTP externo (Resend, SendGrid ou o SMTP do provedor atual) não será usado; nenhuma senha de e-mail precisa ser fornecida ou armazenada.

## Próximo passo

Aprovar e abrir a configuração do subdomínio de envio para exibir os registros NS.
