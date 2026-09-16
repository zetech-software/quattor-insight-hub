# Terceiro perfil: Gestão (manager)

Plano de permissões para conferência. Nada será alterado antes da sua aprovação.

## 1. Nova permissão no banco

Acrescentar o valor `manager` ao tipo de permissão já existente (que hoje aceita só `admin` e `client`). As contas atuais não mudam com isso.

## 2. Rotas por perfil

| Rota | Admin | Gestão | Cliente |
|---|---|---|---|
| `/` calculadora | sim | sim | sim |
| `/historico` | sim | sim | sim (só os próprios) |
| `/regina` | sim | sim | sim |
| `/admin` painel | sim | sim | não |
| `/admin/clientes` | sim | sim | não |
| `/admin/relatorios` | sim | sim | não |
| Ações sensíveis (permissões, assinaturas, exclusões) | sim | **não** | não |

## 3. Menu por perfil

- **Admin:** Calculadora, Histórico, Regina + bloco administrativo (Painel, Clientes, Relatórios) com todas as ações.
- **Gestão:** exatamente os mesmos itens de menu do admin; a diferença aparece dentro das telas — botões e campos de ações sensíveis simplesmente não existem para ela.
- **Cliente:** Calculadora, Histórico, Regina.

## 4. Gestão de Clientes — o que Gestão pode e não pode

Permitido: ver a lista de clientes, buscar, ver empresa, situação e quantidade de cálculos, convidar novo cliente (com envio do e-mail de definição de senha) e ativar/desativar cliente.

Bloqueado: criar ou promover administrador, alterar a permissão de qualquer conta, excluir conta em definitivo, excluir cálculos, e alterar assinatura/plano. Os controles de plano e de exclusão não são exibidos, e o servidor recusa essas ações mesmo se forem chamadas por fora da tela.

Regra adicional de segurança: a Gestão só pode ativar/desativar contas de **cliente** — pedir para desativar um administrador ou outra conta de gestão é recusado pelo servidor.

## 5. Regras de acesso do banco (RLS)

Hoje todas as regras perguntam apenas "é admin?". Passariam a:

- **Perfis:** leitura e atualização também para Gestão — mas exclusão continua **só admin**.
- **Cálculos:** leitura também para Gestão (necessária para painel e relatórios); exclusão continua **só admin**.
- **Permissões:** leitura também para Gestão (a tela de clientes precisa distinguir quem é administrador); criar, alterar e excluir permissão continuam **só admin**.
- **Assinaturas:** leitura também para Gestão; qualquer alteração continua **só admin**.

Nenhuma regra atual de admin ou de cliente é enfraquecida; o cliente continua vendo apenas os próprios dados.

## 6. Função de gestão de clientes (servidor)

- A verificação de entrada passa a aceitar admin **ou** gestão, em vez de apenas admin.
- Cada ação passa a ter sua própria exigência: convidar e ativar/desativar → admin ou gestão; alterar assinatura → só admin; ativar/desativar conta administrativa → só admin.
- Convite continua criando a conta com permissão de **cliente** e enviando o e-mail de definição de senha. A Gestão nunca escolhe a permissão do convidado.
- Recusa de ação retorna mensagem clara, sem detalhe técnico.

## 7. Controle de rotas no site

O controle de rotas hoje compara com **uma única** permissão. Passa a aceitar uma lista: as três páginas administrativas exigem "admin ou gestão". O comportamento atual continua idêntico — aguarda o carregamento antes de decidir, respeita conta desativada e a troca obrigatória de senha, e devolve à calculadora quem não tem direito.

## 8. Painel e relatórios

Sem mudança de conteúdo: Gestão vê os mesmos números e os mesmos relatórios (leitura). O que muda é apenas que ela não pode apagar nada nem mexer em plano. A geração de relatórios em PDF continua igual.

## 9. Validação com conta temporária e migração do suporte

Antes de tocar em suporte@qu4ttuor.com.br, criar uma **conta temporária de gestão** só para validar o perfil de ponta a ponta.

Com ela serão testados: painel, clientes, relatórios, convite de cliente, ativar/desativar cliente, bloqueio de exclusão, bloqueio de assinatura/plano, bloqueio de alteração de permissão, bloqueio de qualquer ação sobre administrador ou outra conta de gestão, acesso direto por endereço, F5, sair, e tentativa de chamar as ações sensíveis diretamente no servidor (sem passar pela tela).

Só depois de **todos** esses pontos passarem:

1. Confirmar que existe outro administrador ativo (o proprietário) — sem isso, não prossegue.
2. Trocar a permissão de suporte@qu4ttuor.com.br de admin para gestão.
3. Entrar com ela e reconferir os mesmos pontos.
4. Confirmar que o proprietário mantém acesso total e que o cliente segue restrito.

Por fim, apagar a conta temporária e todos os dados ligados a ela, e confirmar que não sobrou nenhum registro de teste.

Reverter é uma linha: devolver a permissão de admin ao suporte. A senha e os dados da conta não são tocados.


## 10. Testes previstos

Admin (todas as páginas e ações), Gestão (páginas liberadas, ações permitidas funcionando, ações sensíveis ausentes na tela e recusadas no servidor, tentativa de desativar administrador recusada), Cliente (páginas administrativas negadas por endereço direto, vê só os próprios dados), além de F5, acesso direto por endereço, sair e voltar. Mais a suíte automatizada, a checagem de tipos e o build.

## 11. Arquivos e alterações previstos

- Nova migração: valor `manager` no tipo de permissão + reescrita das políticas citadas no item 5.
- `src/components/ProtectedRoute.tsx` — aceitar lista de permissões.
- `src/App.tsx` — as três rotas administrativas passam a exigir "admin ou gestão".
- `src/pages/AdminClientes.tsx` — esconder controles de plano e de exclusão para Gestão.
- `src/pages/AdminDashboard.tsx`, `src/pages/AdminRelatorios.tsx` — apenas ajustes se houver ação sensível exposta.
- `supabase/functions/manage-clients/index.ts` — autorização por ação, com redeploy.
- `src/components/AppSidebar.tsx` — bloco administrativo visível também para Gestão.

Sem mudanças em regras de cálculo, calculadora, Regina, layout, contas existentes ou configuração de e-mail.

## 12. Risco e ordem de execução

Mexer em regras de acesso do banco é a parte sensível: a implementação será feita em uma migração única, mantendo intactas as condições de cliente, e validada com login real dos três perfis antes de migrar a conta de suporte. Até essa migração, o suporte continua administrador pleno.
