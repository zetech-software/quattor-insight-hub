# Quattor Insight Hub
Sistema de conferência do recebimento de diesel, histórico, relatórios e assistente Regina.
React/Vite/TypeScript, Supabase Auth/Postgres/Edge Functions e Stripe.

## Desenvolvimento
Node 22.12+ (CI usa 24). npm é o gerenciador único.
Copie .env.example para .env.local com o projeto de homologação.
Após a atualização do lock, use:
```sh
npm ci
npm run dev
npm run check
npm run test:ui
```
As variáveis VITE_* são públicas. Nunca coloque service_role, senhas, chaves privadas ou tokens administrativos no frontend.
A configuração pública já presente em .env aponta para o ambiente original; use .env.local para sobrepor em desenvolvimento.

## Banco e migrações
Supabase possui a base histórica. Drizzle possui alterações posteriores.
Em projeto novo, aplicar primeiro todos os arquivos supabase/migrations em ordem cronológica e depois drizzle/migrations 0000..0008.
Em projeto existente, conferir o histórico antes de aplicar apenas as migrações pendentes.
Não usar geração automática de esquema: as migrações SQL versionadas são a fonte de verdade; os pacotes e o schema vazio de geração foram removidos.
CI recria toda a sequência em PostgreSQL descartável e testa as políticas.
tests/sql/bootstrap.sql é exclusivo de CI, nunca de produção.

## Funções
Publicar save-calculation, change-password, manage-clients, provision-client, pet-chat, public-plans, create-checkout e payments-webhook.
Configurar APP_ORIGIN com a origem HTTPS aprovada, sem caminho, e os segredos indicados em .env.example.
As funções operacionais verificam o usuário no Auth e a elegibilidade no banco.
Mudança de senha deve usar change-password; atualização direta pelo SDK Auth não dispensa o primeiro acesso.

## Assinaturas e cobrança
Política aprovada: cliente sem assinatura cadastrada tem acesso manual; assinatura vencida/cancelada ou com prazo encerrado bloqueia o uso.
Equipe interna é isenta de assinatura, mas não de atividade ou senha pendente.
Assinatura Stripe de teste não concede acesso em produção.
O checkout usa apenas o código do plano; ambiente, preço e URLs são determinados no servidor.
A cobrança continua com a trava BILLING_HOMOLOGATED=false. Não liberar sem planos/preços aprovados, configuração do provedor e homologação de compra/renovação/cancelamento/primeiro acesso.
Eventos são assinados, reservados com lease e reconciliados com o estado atual do provedor. Falhas ficam recuperáveis com reenvio do webhook depois da correção; eventos em processamento voltam a ser elegíveis após cinco minutos.

## Regina e dados
O servidor registra pergunta, tópico, situação e tokens. Clientes não podem fabricar telemetria.
Limites iniciais: 10 solicitações por minuto e 100 por dia UTC por usuário, 2.000 tokens de saída e 60 segundos por requisição.
Não usar respostas da IA como aprovação autônoma de descarga; o motor determinístico e a validação do responsável técnico continuam sendo a referência.
Históricos e relatórios percorrem páginas pela chave primária para não truncar dados no limite da API; relatórios usam um instante de corte de criação.

## Operação e liberação
Ver docs/SECURITY-ROLLOUT.md e docs/RELEASE-CHECKLIST.md.
A branch/PR por si só não aplica SQL nem publica funções no Supabase/Lovable.
A liberação exige backup, teste de restauração, validação dos fluxos reais e publicação coordenada do banco, funções e frontend.
