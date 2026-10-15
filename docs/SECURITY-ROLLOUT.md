# Auditoria — implantação coordenada

Branch: fix/audit-access-calculation-integrity. PR #1.

## Correções implementadas
- Acesso operacional validado no banco e nas funções: conta ativa, papel, senha definida e elegibilidade. Clientes sem assinatura mantêm acesso manual; assinatura explicitamente encerrada ou vencida bloqueia operações. Equipe independe de assinatura.
- RLS restringe alterações de perfis; cálculos só são persistidos pelo servidor, com entradas validadas e resultados recalculados pelo mesmo motor usado na prévia.
- Primeiro acesso atualiza a senha no Auth antes de liberar a flag. Falhas não liberam acesso.
- Regina tem cotas persistentes, telemetria no servidor, timeout, limite de saída e isolamento de sessão entre contas.
- Webhooks verificam assinatura e usam reserva com lease para repetição/recuperação; estado de assinatura é reconciliado com o provedor. Cobrança permanece desligada até homologação.
- Histórico e relatórios paginam consultas; CSV neutraliza fórmulas; painel agrega no banco. Sessões e falhas de carregamento fecham acesso.
- Dependências atualizadas e lock npm regenerado. CI instala com npm ci e bloqueia advisories npm de qualquer severidade.

## Evidências e limites
CI executa fixtures de cálculo, testes das funções com Auth/SDK/HTTP simulados, PostgreSQL 16 descartável com os dois históricos de migrações e testes RLS/cotas/leases, TypeScript, Vitest, build e Chromium.
O teste de navegador usa APIs simuladas: não comprova SMTP, Auth real, Stripe ou provedor de IA.
A auditoria npm retornou zero advisories em 15/10/2026; isso não é garantia de ausência de falhas.
Bootstrap em tests/sql é EXCLUSIVO do banco descartável. Nunca aplicá-lo ao banco real.
Histórico não foi recalculado. PDF/CSV continuam exportações, sem assinatura digital.
A rotina de retenção exige política e execução deliberadas; não apaga dados automaticamente.

## Homologação e publicação
1. Backup verificável e inventário das migrações existentes. Confirmar supabase/migrations em ordem e drizzle 0000..0006 antes de aplicar 0007 e 0008.
2. Configurar segredos exclusivamente no servidor, APP_ORIGIN e ambientes de pagamento; conferir .env.example e RELEASE-CHECKLIST.md.
3. Em homologação, publicar todas as funções alteradas e aplicar drizzle/migrations/0007_access_and_calculation_integrity.sql e drizzle/migrations/0008_subscriptions_assistant_and_webhook.sql. Publicar o frontend correspondente na mesma janela.
4. Testar visitante, clientes A/B, manager, support e admin; bloqueio de sessão já emitida, senha pendente, convite/recovery por e-mail, acesso manual e assinatura encerrada.
5. Conferir cálculo no banco/UI/PDF contra planilha aprovada pelo responsável técnico, incluindo limites de temperatura e densidade.
6. Homologar streaming/telemetria/cotas da IA, convite e repetição/ordem/falhas de webhooks no ambiente de testes. Habilitar cobrança somente após aprovação comercial e técnica.
7. Promover após evidências reais. Manter manutenção durante a troca caso o frontend antigo ainda esteja ativo: a escrita direta de cálculos será negada.
Esta branch não aplica SQL, publica funções ou faz deploy automaticamente. Não mesclar apenas para disparar a sincronização do frontend antes da atualização coordenada do backend.

## Reversão
Preservar backup e histórico. Em incidente, manter manutenção e corrigir ou reverter versões coordenadas de frontend/funções/esquema. Não reabrir escrita direta de cálculos nem restaurar a RPC que dispensava definição de senha.
