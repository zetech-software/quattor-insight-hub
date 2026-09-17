# Logo nos PDFs — causa e correção

## O que a auditoria encontrou

Rastreei todos os botões que geram PDF no sistema. Todos passam por um único gerador de cabeçalho:

- PDF individual da Calculadora
- PDF individual do Histórico
- Laudo individual por NF
- Relatório consolidado de Conferências
- Relatório de Clientes
- Relatório de Cálculos
- Relatório de Assinaturas

Não existe nenhum outro gerador de PDF paralelo no projeto.

## Causa

A logo **está** sendo embutida no arquivo: gerei um PDF dentro do navegador, com o mesmo código do sistema, e a imagem aparece de fato incorporada dentro do documento (imagem de 560x216 com transparência), sem erro nenhum.

Ou seja, a logo falha nos PDFs que você baixou porque eles vieram de uma versão anterior do sistema: o endereço publicado só recebe as mudanças depois de publicar novamente, e o navegador também pode ter guardado a versão antiga em cache. A correção da logo foi feita depois do último envio para o ar.

## O que ainda precisa mudar

Você pediu a logo sem nenhuma caixa branca ou preta em volta. Hoje ela aparece dentro de um retângulo branco arredondado sobre a faixa laranja (o retângulo existia só para dar contraste, já que as letras da logo são vermelhas/laranja e ficariam ilegíveis direto sobre o laranja).

Ajuste proposto, sem redesenhar os relatórios:

- Topo da primeira página passa a ser uma área branca com a logo à esquerda, sem caixa nenhuma, em tamanho discreto e sem distorção.
- O título do relatório fica ao lado da logo, em texto escuro, e a data logo abaixo.
- Uma linha laranja fina fecha o cabeçalho, mantendo a identidade atual.
- Tudo o que vem depois (tabelas, totais, aviso legal, rodapé e paginação) continua igual, apenas começando na mesma altura de hoje.
- A logo continua a mesma imagem PNG de fundo transparente, sem mudar desenho, texto, cores ou proporção.

## Detalhes técnicos

- `addHeader()` em `src/lib/pdfReports.ts` continua sendo o único helper compartilhado; ele passa a devolver a posição Y final para o conteúdo seguinte.
- A logo permanece embutida em base64 (`src/lib/pdfLogo.ts`), gerada do PNG transparente em `src/assets/qu4ttuor-logo.png` — sem URL externa, sem carregamento assíncrono, funciona igual no build de produção.
- Remoção do `roundedRect` branco e da faixa laranja cheia; entra uma linha divisória laranja.
- Nada de conteúdo, fórmulas, filtros, dados, permissões, Excel, CSV ou telas é alterado.

## Verificação

- Gerar de verdade, no navegador, um PDF de cada um dos sete fluxos e conferir visualmente página por página: logo presente, sem caixa, sem distorção, sem cobrir título nem quebrar tabela.
- Rodar os testes automatizados, a verificação de tipos e o build.
- Depois disso, publicar novamente para que o endereço público passe a sair com a logo.
