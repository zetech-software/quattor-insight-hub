# Correção dos dois pontos que bloqueiam a finalização

Escopo restrito: apenas a assistente Regina. Calculadora, histórico, painel, relatórios, clientes, layout e banco de dados ficam intocados.

## Problema 1 — Regina ensina a regra antiga

As instruções da assistente ainda dizem que o VCT vem de uma fórmula com dois fatores e falam em subtrair o VCT do volume medido, além de citar milímetros.

Serão corrigidas para a regra vigente:
- VCT é igual ao Volume da Nota Fiscal.
- Diferença = Volume Atestado − Volume da Nota Fiscal.
- A situação da seta e o resultado são sempre em litros; nenhuma menção a milímetros.
- Volume Atestado = Volume da Nota Fiscal + Situação da Seta (negativo = falta, positivo = sobra, zero = na seta).
- Tolerância aceitável de −0,06% a +0,06% sobre o VCT.
- Qualidade: aprovado quando a diferença entre a massa específica da amostra e a da nota for de até 0,003; acima disso, reprovado.
- A fórmula antiga não deve mais ser ensinada.

Depois: perguntar a ela o que é VCT, como a diferença é calculada, qual a unidade da seta, o caso de nota 10.000 L com volume atestado 9.850 L, e o caso de volume atestado maior que a nota — conferindo que as respostas batem com o cálculo real.

## Problema 2 — Regina responde sem login

Hoje o serviço da assistente atende qualquer chamada, inclusive de quem não está logado, gastando créditos de IA.

Passará a validar a sessão do usuário no próprio servidor antes de responder. Quem não estiver logado, ou tiver sessão expirada/inválida, recebe uma recusa curta, sem detalhes internos. Quem está logado (administrador ou usuário comum) continua usando normalmente pela tela.

Testes: uso pela interface como administrador e como usuário comum; tentativa deslogado; chamada direta sem credencial; chamada com credencial válida; token inválido/expirado.

## Detalhes técnicos

- `supabase/functions/pet-chat/index.ts`: reescrever o `SYSTEM_PROMPT` conforme a regra vigente; antes de chamar o modelo, extrair o header `Authorization`, validar com `supabase.auth.getUser(token)` usando `SUPABASE_URL` + `SUPABASE_ANON_KEY`, rejeitando o token anônimo/publishable; retornar `401 {"error":"Não autorizado"}` quando não houver usuário válido. Manter CORS e o streaming atuais.
- `supabase/config.toml`: garantir `verify_jwt = true` para a função `pet-chat` (a validação no código continua como camada principal).
- `src/hooks/useRegina.tsx`: enviar no header `Authorization` o access token da sessão atual (via `supabase.auth.getSession()`), com fallback para nenhuma chamada quando não houver sessão, em vez da chave publishable fixa.
- Sem alterações de banco, migrations, layout ou outras páginas.
- Ao final: suíte de testes, verificação de tipos, build de produção, teste funcional da Regina e teste do endpoint com e sem credencial; relatório curto com arquivos alterados e resultados.
