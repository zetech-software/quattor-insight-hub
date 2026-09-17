# Chamados de demonstração na Caixa de Chamados

Inserir 8 chamados fictícios para você testar a Caixa do Suporte à vontade. Nada de permissão, tela ou regra é alterado — só dados.

## Identificação como demonstração

Todo assunto começa com `[DEMO]`, o que permite uma limpeza única depois com um único comando. Os chamados ficam no ar até você pedir a remoção.

## Chamados criados

| # | Assunto | Categoria | Prioridade | Situação | Aberto por |
|---|---------|-----------|-----------|----------|-----------|
| 1 | Não consigo acessar minha conta | Acesso / Login | Alta | Aberto | Cliente |
| 2 | Cálculo apresentou diferença que não entendi | Calculadora | Normal | Em atendimento | Cliente |
| 3 | Regina não respondeu minha pergunta | Regina | Baixa | Aguardando cliente | Cliente |
| 4 | Histórico não mostra uma conferência recente | Histórico | Alta | Em atendimento | Cliente |
| 5 | Dúvida sobre relatório | Relatórios | Normal | Aberto | Dono |
| 6 | Anexo com erro apresentado no sistema | Erro no sistema | Urgente | Em atendimento | Cliente |
| 7 | Problema já solucionado | Conta / Perfil | Baixa | Resolvido | Cliente |
| 8 | Chamado fechado | Outro | Normal | Fechado | Cliente |

Observação: o sistema trabalha com quatro níveis de prioridade — baixa, normal, alta e urgente. "Média" entra como normal e "Crítica" como urgente.

## Conteúdo das conversas

- Mensagem inicial do cliente em todos, com os textos que você enviou.
- Respostas do Suporte nos chamados 2, 3, 6, 7 e 8; conversa com três mensagens no 2 e no 4.
- Chamado 4: assumido pelo Suporte (responsável preenchido).
- Chamados 2 e 6: uma nota interna do Suporte cada, visível só para Suporte/Dono.
- Chamados 1 e 3: última mensagem é do cliente e ainda não lida pelo Suporte, para testar o destaque de nova resposta.
- Chamado 6: um anexo de demonstração — um arquivo de texto pequeno chamado `DEMO-erro-exemplo.txt`, criado pelo sistema, sem conteúdo real de cliente.
- Datas de abertura e de última mensagem espalhadas nos últimos dias para os filtros e a ordenação ficarem naturais.

## Detalhes técnicos

- Inserções de dados em `tickets`, `ticket_messages`, `ticket_attachments` e `ticket_reads` (nenhuma migração de esquema, nenhuma alteração de política).
- Requerente cliente: `enzo@zeregistra.com.br`; requerente do chamado 5: `admin@qu4ttuor.com.br`; autor das respostas do Suporte: `suporte@qu4ttuor.com.br`.
- `ticket_reads` recebe marcação de leitura do Suporte nos chamados sem "nova resposta", para que só 1 e 3 apareçam destacados.
- Anexo enviado ao bucket privado `ticket-attachments` sob um caminho `demo/`, com registro em `ticket_attachments`.
- Nenhum arquivo de código é alterado.

## Validação

Conferir ao vivo: Suporte vê os oito chamados, cards de resumo e filtros com as contagens certas, busca por nome/e-mail/assunto/código, destaque de nova resposta, notas internas separadas e anexo aberto; Cliente vê apenas os próprios sete e nenhuma nota interna; Dono vê a caixa completa. Depois, testes automatizados, tipos e build.
