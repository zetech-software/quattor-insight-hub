# Auditoria final da assistente Regina

Conferência completa da implantação da Regina, corrigindo apenas o que estiver
diretamente ligado a ela. Nada de cálculo, dado, regra de negócio ou tela fora
da assistente será alterado, e o rosto da personagem não será recriado.

## 1. Avatar

- Conferir visualmente o recorte já publicado (rosto, cabelo e ombros) e checar
  se o topo do cabelo não aparece cortado de forma estranha.
- Verificar a exibição nos quatro lugares em que aparece: bolha flutuante,
  cabeçalho do chat, avatar das respostas e tela inicial.
- Checar a nitidez nos tamanhos pequenos (28 px e 40 px).
- Se houver corte ruim, o ajuste será apenas um novo enquadramento da mesma
  imagem enviada (nunca outra pessoa, nunca imagem gerada).

## 2. Responsividade

- Abrir o chat em celular, tablet e desktop e conferir altura, largura, rolagem
  e o painel flutuante em cada tamanho.
- Conferir se "Assistente Virtual de Engenharia" no cabeçalho não estoura nem
  empurra o botão de nova conversa; em telas estreitas o texto pode passar a
  "Assistente Virtual".
- Conferir o campo de digitação, o botão de enviar e as perguntas sugeridas em
  tela pequena.

## 3. Identidade antiga

- Busca completa no projeto por nome, avatar e textos da assistente anterior,
  incluindo estados de carregamento, tela vazia, mensagens de erro, boas-vindas,
  menu, painel flutuante e versão mobile.
- Permanecem intencionalmente apenas dois identificadores internos, invisíveis
  para o usuário: o endereço técnico do serviço de conversa e o link antigo que
  redireciona para a página nova.

## 4. Links e rotas

- Confirmar que a página da Regina abre normalmente para cliente e admin.
- Confirmar que o link antigo redireciona sem erro e que não há página 404
  criada pela mudança.
- Confirmar que o botão flutuante some na própria página da Regina e aparece nas
  demais.

## 5. Funcionamento

- Enviar mensagem real e conferir resposta, rolagem automática, foco no campo,
  estado "Pensando…", nova conversa, abrir e fechar o chat e navegação entre
  páginas com o chat aberto.
- Conferir no navegador se não há erro no console nem falha de rede.

## 6. Qualidade visual

- Revisar alinhamento, espaçamento, proporção, bordas, ícones, hover, contraste
  e legibilidade em tema claro e escuro, para a Regina parecer parte do sistema.

## 7. Entrega

Relatório objetivo com: o que foi verificado, erros encontrados, correções
feitas, arquivos alterados, testes executados e resultado final.

## Detalhe técnico

Verificação por leitura de `src/components/regina/*`, `src/hooks/useRegina.tsx`,
`src/pages/Regina.tsx`, `src/App.tsx`, `src/components/AppLayout.tsx`,
`src/components/AppSidebar.tsx` e o prompt da função de conversa; inspeção do
recorte em `src/assets/regina-avatar.png.asset.json`; navegação automatizada com
Playwright em 390 px, 820 px e 1280 px com capturas de tela; varredura com `rg`
por referências antigas; execução da suíte de testes, typecheck e build.
Correções, se necessárias, ficam restritas aos arquivos da assistente.
