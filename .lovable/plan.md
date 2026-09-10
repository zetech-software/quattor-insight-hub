# Correção do acesso direto às páginas de administração

Corrigir apenas a falha em que, ao digitar `/admin`, `/admin/clientes` ou
`/admin/relatorios` direto na barra do navegador (ou dar F5 nessas páginas),
o administrador é jogado de volta para a calculadora.

## Causa confirmada

A permissão do usuário é buscada no banco depois que a tela já considera o
carregamento concluído. No instante da checagem, a permissão ainda está vazia,
então a página entende que o usuário não é administrador e redireciona.
Pelo menu lateral isso não acontece porque a permissão já foi carregada antes.

## Correção

- Passar a marcar o carregamento como concluído somente depois que a permissão
  e o perfil do usuário terminarem de ser buscados.
- Enquanto isso, as páginas protegidas continuam mostrando a tela de
  "Carregando..." que já existe, sem redirecionar.
- Depois de carregado: administrador permanece na página pedida; usuário sem
  permissão continua indo para a calculadora; usuário deslogado continua indo
  para o login.

Nada mais é alterado: layout, Regina, calculadora, histórico, relatórios,
cálculos e banco de dados permanecem exatamente como estão.

## Testes que serão feitos

Acesso direto e F5 em `/admin`, `/admin/clientes` e `/admin/relatorios`;
abertura em nova aba; navegação pelo menu; administrador, usuário comum e
usuário deslogado. Além disso: todos os testes automatizados, verificação de
tipos e build de produção.

## Detalhe técnico

- `src/hooks/useAuth.tsx`: aguardar `fetchUserData` (role + profile) antes de
  `setLoading(false)`, tanto no `getSession()` inicial quanto no
  `onAuthStateChange`; remover o `setTimeout(..., 0)` que soltava a busca sem
  espera. Sem sessão, `loading` fica falso imediatamente. Proteção contra
  atualização fora de ordem entre os dois caminhos.
- `src/components/ProtectedRoute.tsx`: sem mudança de lógica, ou apenas a
  guarda de `role === null` caso ainda seja necessária após o ajuste acima.
- Entrega de relatório curto: arquivos alterados, causa, correção, testes,
  build e confirmação do acesso direto/F5.
