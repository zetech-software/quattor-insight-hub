# Regina — nova assistente virtual

A assistente atual (PET) passa a se chamar **Regina — Assistente Virtual de Engenharia**,
usando a foto enviada como identidade oficial, sem recriar ou alterar a personagem.

## Avatar

- A imagem enviada (`opção_final.png`) vira o avatar oficial da Regina.
- É gerado um recorte circular focado no rosto e parte superior dos ombros, a partir
  da própria imagem, para que continue reconhecível nos tamanhos pequenos
  (bolha flutuante, cabeçalho, mensagens).
- Nenhuma alteração de traços, cabelo, pele ou roupa.

## Onde a Regina aparece

- Bolha flutuante do chat (canto inferior direito).
- Cabeçalho do chat: nome "Regina" e descrição "Assistente Virtual de Engenharia".
- Tela inicial da conversa: "Olá! Eu sou a Regina" e avatar grande.
- Avatar ao lado de cada resposta dela e no estado "Pensando…".
- Menu lateral: item passa de "PET (Assistente)" para "Regina (Assistente)".
- Textos do rodapé do chat e mensagens de fora de escopo passam a falar em nome da Regina.

## O que não muda

Regras de cálculo, banco de dados, telas de cálculo, histórico, relatórios, PDF e
qualquer fluxo fora da assistente permanecem exatamente como estão. O conhecimento e o
escopo de resposta da assistente continuam os mesmos (fórmulas, uso do sistema e
interpretação de resultados).

## Detalhe técnico

- Novo asset de avatar recortado em `src/assets/`; `pet-avatar.png` deixa de ser usado.
- Renomear `src/components/pet/` → `src/components/regina/` (`ReginaChat`, `ReginaFab`),
  `src/hooks/usePet.tsx` → `useRegina.tsx`, `src/pages/Pet.tsx` → `Regina.tsx`,
  rota `/pet` → `/regina` (com redirecionamento de `/pet` para não quebrar links salvos).
- Edge function: manter o endpoint `pet-chat` (evita redeploy/quebra), atualizando apenas
  o `SYSTEM_PROMPT` para a identidade Regina e a frase de recusa fora de escopo.
- Varredura final por qualquer referência textual ou visual remanescente a "PET".
