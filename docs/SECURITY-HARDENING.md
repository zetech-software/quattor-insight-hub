# Correções de segurança: primeira etapa autorizada

Base: 69e6cefe848a46f1cc363b9f8bf797d783ef9bbf. Branch: audit/security-hardening.

## Escopo

Este lote cobre as prioridades 1 a 5 aprovadas: instalação reproduzível, autorização de perfis, bloqueio de contas desativadas, comprovação de troca de senha, estado de autenticação, privacidade da Regina e exportação CSV. Nenhuma migração foi aplicada a um banco hospedado. Não houve alteração de credenciais, deploy ou merge.

As fórmulas de diesel, tolerâncias, layout normal, relatórios PDF/XLSX, gateways Lovable, armazenamento de preview e configurações comerciais permanecem preservados. A cobrança continua bloqueada por BILLING_HOMOLOGATED=false. As alterações em arquivos de pagamento fora do provision-client são exclusivamente de tipagem para o lint, sem alterar o processamento.

## Alterações

| Área | Correção | Proteção de regressão |
|---|---|---|
| Instalação | package-lock sincronizado, scripts de typecheck e testes de segurança, workflow de validação sem deploy | Instalação limpa, testes, lint, tipos e build |
| Perfis | Edição direta de outras contas somente para admin. Identidade e data de criação imutáveis. Campos administrativos protegidos | Matriz cliente A/B, Gestão, Suporte e Admin no PostgreSQL |
| Conta desativada | Políticas restritivas e RPC de elegibilidade. Funções privilegiadas negam acesso em erro ou resultado negativo | Leituras/escritas e poderes de admin desativado, falha da consulta |
| Senha obrigatória | Prova privada produzida somente quando Auth muda encrypted_password. RPC não cria sua própria prova | Chamada direta, marcador antigo, metadados, hash inalterado, prova antiga, troca real |
| Sessão | Descarta respostas antigas, limpa estado antes do logout, impede renovação durante logout e oferece retry em erro | Consultas A/B invertidas, falhas, ausência de papel e logout pendente |
| Regina | Conversa vinculada à conta, cancelamento na saída e validação de identidade antes do envio | Troca de conta, logout e interação pendente |
| CSV | Escape de campos e neutralização de fórmulas em texto, preservando números negativos | Delimitadores, aspas, quebras de linha e prefixos de fórmula |

Gestão e Suporte continuam convidando e ativando/desativando clientes por manage-clients. Não recebem edição direta de perfis internos. As telas de login, troca de senha e recuperação continuam podendo ler somente os próprios dados mínimos de perfil/papel para apresentar o estado correto. As políticas operacionais negam acesso quando a conta está desativada ou com troca obrigatória pendente.

## Banco e migrações

A sequência existente foi mantida: primeiro supabase/migrations em ordem, depois drizzle/migrations em ordem. As migrações novas são 0007_protect_profile_administration, 0008_enforce_account_access e 0009_verify_password_change. Journal e snapshots seguem a convenção existente de migrações SQL customizadas e schema Drizzle vazio. Não usar drizzle-kit push para inferir o schema a partir desse arquivo vazio.

A migração 0009 adiciona password_change_required_at e a tabela privada quattor_private.password_changes. Essa tabela guarda somente user_id e data da alteração, sem senha, hash ou token. Um trigger AFTER UPDATE OF encrypted_password em auth.users registra uma mudança efetiva. A RPC clear_must_change_password exige prova posterior à obrigação atual. O gatilho de perfis também valida essa prova, sem confiar na antiga configuração de sessão. A identidade e os marcadores de obrigação não podem ser alterados por clientes.

O registro privado não é exposto à Data API e não concede permissões a anon/authenticated. A coluna usa default now() para aproveitar a adição de coluna sem reescrita geral em versões modernas do PostgreSQL. Não há exclusão nem recálculo de dados existentes. Contas já marcadas para troca exigirão uma alteração de senha posterior à aplicação dessa migração.

Antes de aplicar em ambiente hospedado, conferir schema/migrações reais, permissões do executor para criar o trigger em auth.users, backups e compatibilidade com o fluxo Auth do projeto. Objetos internos de Auth são gerenciados pelo Supabase. A homologação real com convite e recuperação em um projeto de teste continua necessária. Os testes de banco deste lote usam PostgreSQL/PGlite com schemas mínimos Auth/Storage, sem executar GoTrue, SMTP ou gateway HTTP.

A ordem de publicação, quando autorizada separadamente, é migrações, funções e frontend. As funções novas exigem is_account_ready: não implantá-las antes da migração. O frontend anterior mantém a mesma RPC e funciona após troca real de senha. Não aplicar rollback automático que reabra as políticas antigas. Qualquer reversão de banco precisa ser desenhada e ensaiada para o estado efetivamente aplicado.

## Verificação

Resultado local: 163 testes passaram em 9 arquivos (26 testes de banco), lint com 0 erros e 10 avisos de Fast Refresh, typecheck do app e da configuração Node aprovado, build de produção concluído. A instalação npm ci --ignore-scripts concluiu com sucesso. Os avisos de CSS/Browserslist/tamanho do bundle foram mantidos.

npm é o gerenciador usado pelo workflow e pela validação. O lock Bun recebeu somente a entrada sem dependências transitivas de PGlite. O manifesto completo e a integridade dessa entrada foram comparados com npm por um parser JSONC. A geração pela CLI Bun não concluiu neste ambiente e foi cancelada. No PR #2, o GitHub Actions aprovou a instalação frozen com Bun 1.3.1, os 163 testes, typecheck e build em Linux. Isso verifica o lock Bun, mas a publicação pelo Lovable continua pendente. O arquivo binário legado bun.lockb não foi alterado. Executar npm ci --ignore-scripts, npm test, npm run lint, npm run typecheck e npm run build. O teste de RLS está incluído em npm test e pode ser selecionado com npm run test:security. PGlite 0.3.14 é dependência somente de desenvolvimento e não entra no bundle da aplicação.

Em Windows, se o npm estiver configurado para um Git Bash bloqueado pelo ambiente, usar a opção --script-shell=C:\Windows\System32\cmd.exe ao chamar npm run. Não é necessário mudar configuração global. O workflow Linux usa o shell normal do runner.

A suíte mantém as 99 assertivas anteriores de cálculo/senha/exemplo e acrescenta regressões de segurança. O lint preserva os avisos de Fast Refresh existentes. Há uma única exceção localizada de prefer-const para o adaptador de preview gerado pelo Lovable, cujo arquivo não foi editado. Não foi desativada a regra de any para os arquivos de pagamento: foram adicionados tipos sem efeito em runtime.

## Pendências fora deste lote

A verificação npm audit --omit=dev identificou 19 entradas no grafo resolvido (17 altas e 2 moderadas). Esse número não equivale a 19 explorações demonstradas no aplicativo. Inclui avisos em ferramentas de processamento de CSS/globs, bibliotecas de rota e xlsx. O alcance precisa ser validado por caminho de uso. O aplicativo exporta XLSX, sem ler arquivos XLSX arbitrários. Nenhum npm audit fix, atualização principal de Tailwind ou substituição automática de biblioteca foi realizado.

Paginação e totais, tratamento amplo de erros de relatórios, precisão de cálculo, integridade dos resultados persistidos e limites/cotas de IA continuam nos lotes seguintes. O webhook ainda precisa de recuperação/idempotência e isolamento efetivo entre ambientes antes da ativação da cobrança.

O build pode manter avisos de importação CSS, Browserslist e tamanho de chunk. Eles não foram ocultados nem tratados como falhas de segurança corrigidas. Deno, integração HTTP/GoTrue, testes reais de e-mail, navegador publicado e produção não são certificados pelos testes locais. Nenhuma alteração de proteção de main ou configuração Lovable foi aplicada.
