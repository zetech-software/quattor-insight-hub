# Convites com remetente oficial Qu4ttuor

## Situação atual (auditada, nada foi alterado)

- O projeto **não tem nenhum remetente próprio configurado**: o envio hoje sai pelo remetente padrão da plataforma, compartilhado com outros projetos. É exatamente por isso que a entrega do convite anterior não pôde ser comprovada.
- O convite é criado pelo fluxo administrativo oficial (área de Gestão de Clientes), que gera a conta e pede à plataforma o e-mail de definição de senha. Esse fluxo está correto e **não precisa mudar**.
- Não existe nenhuma senha, chave ou credencial de e-mail no projeto — nada a limpar.
- O domínio `qu4ttuor.com.br` não está registrado como domínio de envio deste projeto, portanto não há SPF/DKIM/DMARC verificados para ele aqui.

## Recomendação

Usar a infraestrutura de e-mail própria da Lovable em vez de contratar e cadastrar um SMTP externo manualmente. Motivos:

- Não é preciso guardar usuário e senha de SMTP em lugar nenhum.
- SPF, DKIM e DMARC são criados e mantidos automaticamente.
- Passa a existir registro de fila, envio, rejeição e reclamação — ou seja, dá para provar entrega, o que hoje é impossível.

**Remetente recomendado:** `noreply@qu4ttuor.com.br` para os e-mails automáticos (convite, definição e recuperação de senha), com nome exibido "Qu4ttuor Consultoria". O `suporte@` deve continuar sendo uma caixa que recebe respostas de pessoas, não o remetente dos automáticos.

## O que você precisa fornecer

Apenas **um acesso**: o painel onde o domínio `qu4ttuor.com.br` é administrado (onde o site e o e-mail da empresa foram apontados — normalmente o registrador, ex. Registro.br, ou o provedor de DNS, ex. Cloudflare). Nele será preciso colar dois registros que o sistema vai gerar para você. Nada de senha de e-mail, nada de cartão, nada de chave.

Se o painel do domínio não permitir adicionar registros do tipo NS, existem duas saídas: transferir o domínio para a Lovable, ou passar a hospedagem de DNS para um provedor que permita. Só saberemos ao abrir o painel.

## Passo a passo da implantação

1. Abrir a configuração de e-mail e informar o subdomínio de envio (sugestão: `notify.qu4ttuor.com.br`) — o endereço visível continua sendo `noreply@qu4ttuor.com.br`.
2. Você copia os registros exibidos para o painel do domínio.
3. Aguardar a verificação (normalmente minutos; pode levar até 72 h).
4. Definir nome e endereço do remetente nos e-mails de autenticação.
5. Enviar um convite real para um endereço seu e acompanhar o registro de envio.
6. Confirmar recebimento, remetente exibido como Qu4ttuor e link válido.
7. Definir a senha pelo link, entrar como cliente, confirmar acesso à calculadora/histórico e bloqueio das páginas administrativas.
8. Apagar a conta usada no teste.

Só depois do item 7 o fluxo é considerado aprovado.

## Riscos

- Enquanto o domínio não estiver verificado, os convites continuam saindo pelo remetente padrão, com a mesma chance de cair em spam. Nada piora, só não melhora ainda.
- Se o domínio já usar algum outro serviço de envio no mesmo subdomínio, haveria conflito — por isso a sugestão de um subdomínio dedicado (`notify.`), que convive com o e-mail atual da empresa sem afetá-lo.
- Nenhum e-mail da empresa (caixas, recebimento, MX principal) é afetado por esta configuração.

## Detalhes técnicos

- Nenhuma alteração em `supabase/functions/manage-clients/index.ts`, contas, permissões, telas ou banco nesta etapa.
- Após a verificação do domínio, os e-mails de autenticação (convite, `recovery`, `magiclink`) passam a ser renderizados por templates próprios do projeto e enfileirados com registro em log, substituindo o remetente padrão.
- SMTP externo (Resend/SendGrid/SMTP do provedor atual) fica como alternativa apenas se você preferir explicitamente; nesse caso seria necessário fornecer host, porta, usuário e senha, que teriam de ser guardados como segredo do projeto.

## Próximo passo

Aprovar este plano e abrir a configuração do domínio de envio.
