# Auditoria: sistema x planilha original (somente conferência)

A planilha original `Calculo_de_Recebimento_de_Diesel_-_Web.xlsx` continua disponível,
assim como a suíte de testes e o arquivo de casos de referência do projeto.
Esta etapa não altera nenhum arquivo, dado ou cálculo — produz apenas um laudo de conferência.

## O que será conferido

1. **Mapa completo da planilha**
   Extração de todas as fórmulas, abas e tabelas de coeficientes, célula por célula,
   incluindo a aba de apoio usada na estimativa de temperatura.

2. **Comparação item a item com o sistema**
   Cada grandeza calculada hoje pelo sistema é confrontada com a célula equivalente da planilha:
   - densidade da NF a 20 °C (DNF20)
   - fator de correção da NF (FCNF)
   - temperatura estimada de carregamento
   - densidade da amostra a 20 °C (DAC20)
   - diferença de qualidade (DAC − DNF) e a regra de aprovado/reprovado
   - fator de correção do CT (FCCT)
   - volume a 20 °C (V20)
   - VCT, VCT mínimo e VCT máximo, com a tolerância de ±0,06%
   - volume atestado e diferença, com a Situação da Seta
   - situação final (falta, sobra, conforme)

3. **Conferência numérica em vários cenários**
   A planilha é recalculada com LibreOffice para um conjunto de entradas variadas
   (densidades em faixas diferentes, temperaturas baixas, médias e altas, seta positiva,
   negativa e zero) e o resultado é comparado com o mesmo cenário rodado pelo código.
   Para cada célula é registrada a diferença absoluta encontrada.

4. **Conferência das tabelas de coeficientes**
   Verificação de que os coeficientes de correção usados no código são idênticos aos da
   planilha, inclusive nos limites de faixa, e de que a busca usa a mesma densidade de entrada.

5. **Conferência dos arredondamentos e da exibição**
   Confirmação de que o número de casas decimais mostrado na tela e no PDF não muda o
   resultado do cálculo e corresponde ao que a planilha apresenta.

## Entregável

Um laudo em texto no chat com:
- tabela de cada grandeza: valor da planilha, valor do sistema, diferença;
- lista objetiva de divergências, se houver, com a causa provável;
- pontos em que o sistema difere intencionalmente da planilha por decisão tomada nas
  conversas anteriores (por exemplo campos deixados de fora da tela);
- conclusão: bate integralmente, bate com ressalvas, ou não bate.

Nenhuma correção é aplicada nesta etapa. Se aparecer divergência, ela é apenas relatada,
com a proposta de ajuste para você aprovar depois.

## Detalhe técnico

Leitura da planilha com openpyxl (fórmulas) e recálculo via LibreOffice em cópia temporária
fora do projeto; execução da suíte existente em `src/test/dieselCalculations.test.ts` e
dos casos de `src/test/fixtures/golden-cases.json` apenas em modo de leitura.
