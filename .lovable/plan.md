# Correção dos 3 itens de acabamento

Escopo restrito aos três pontos aprovados. Nada além disso será tocado.

## 1. Regina precisa avisar quando falha

Hoje a resposta que falha só registra o erro no console: a pergunta fica na tela, o "Pensando…" desaparece e nada é dito.

- Passa a aparecer, dentro da conversa, um aviso claro em vez do silêncio:
  - falha de rede ou serviço fora do ar: "Não consegui responder agora. Tente novamente em instantes."
  - sessão expirada ou sem acesso: "Sua sessão expirou. Entre novamente para continuar conversando com a Regina."
- Junto do aviso, um botão "Tentar novamente" que reenvia a última pergunta.
- O aviso desaparece ao enviar nova mensagem, e a conversa volta a funcionar normalmente quando a rede retorna.
- Nenhum detalhe técnico é mostrado (sem códigos, chaves ou mensagens internas).
- Comportamento normal da Regina (respostas, sugestões, nova conversa, abrir/fechar) permanece igual.

## 2. Gráfico "Cálculos por Semana"

Existem 6 cálculos, todos anteriores às últimas 8 semanas, e o gráfico diz "Sem dados de cálculos ainda" — contradizendo o total exibido ao lado.

- Nunca houve nenhum cálculo: continua "Sem dados de cálculos ainda".
- Existem cálculos, mas nenhum nas últimas 8 semanas: passa a dizer "Não houve cálculos nas últimas 8 semanas."
- Os dados, o período de 8 semanas e o resto do painel não mudam.

## 3. Volume da NF com validação

O campo aceita hoje −5 e 999999999999 sem qualquer aviso.

- Valor negativo: recusado, com a mensagem "O volume não pode ser negativo".
- Acima do limite: recusado, com a mensagem "Volume acima do limite permitido (máximo 60.000 L)".
- Zero e campo vazio continuam se comportando como hoje (apenas não geram cálculo).
- Decimais válidos continuam aceitos.
- Enquanto o valor estiver inválido, o campo fica destacado, o resumo não calcula e o botão de salvar fica indisponível — igual ao que já acontece com os campos de massa específica.
- A fórmula do cálculo não muda.

**Limite adotado: 60.000 L.** Referência tirada do próprio projeto: os casos de teste oficiais vão de 10.000 a 20.000 L e o maior registro salvo é 20.250 L. 60.000 L dá folga confortável acima da maior carga real registrada, sem permitir números absurdos.

## Detalhes técnicos

- `src/components/regina/ReginaChat.tsx`: estado local de erro alimentado pelo `catch` do envio e pelo `status === "error"` do `useChat`; renderiza um bloco de aviso na lista de mensagens com botão de reenvio da última pergunta do usuário.
- `src/hooks/useRegina.tsx`: `sendMessage` passa a propagar um erro tipado distinguindo falha de autenticação (sem sessão ou 401) de falha genérica, para o chat escolher a mensagem; `onError` do `useChat` mapeado da mesma forma.
- `src/pages/AdminDashboard.tsx`: `stats` ganha o total de cálculos já disponível (`totalCalcs`) para escolher entre as duas mensagens no bloco vazio do gráfico; nenhuma alteração na montagem de `weeklyData`.
- `src/pages/Index.tsx`: nova função `validateVolumeNF(value)` no mesmo padrão de `validateDensity`; `volumeError` incluído em `hasValidationErrors`, borda destacada e mensagem sob o campo; `results` retorna `null` quando o volume é inválido.

## Fora de escopo (não será alterado)

Acessibilidade, botão flutuante da Regina, histórico, coluna VCT, nome de cliente no histórico, `useAuth`, performance, code splitting, bundle, pluralização, warnings do React, banco de dados, migrations e layout geral.

## Verificação após as correções

Testes automatizados, verificação de tipos, build de produção e teste funcional dos três pontos no navegador (falha de rede e sessão expirada na Regina, mensagem do gráfico, volume −5 / 999999999999 / 15.000 / 0).
