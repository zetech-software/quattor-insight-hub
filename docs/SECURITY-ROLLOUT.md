# Primeira etapa da auditoria — acesso e integridade
Branch: fix/audit-access-calculation-integrity.

## O que muda
- RLS exige conta ativa, papel cadastrado e senha já definida nas operações de cálculos, assinaturas e Regina.
- Conta bloqueada ainda lê seu próprio perfil/papel para sair da interface ou recuperar acesso.
- Manager não altera perfis de equipe. Em clientes, pode apenas alterar atividade, preservando demais campos.
- RPC clear_must_change_password apenas confirma conclusão; não limpa a flag.
- change-password valida sessão, atualiza senha pelo endpoint do próprio usuário no Auth e só então libera a flag por service role.
- save-calculation valida entradas e recalcula resultados. INSERT/UPDATE diretos de cálculos por authenticated são revogados.
- Prévia e persistência importam o mesmo motor. Temperaturas/seta vazias não viram zero. Ruído IEEE-754 no limite de 0,003 é absorvido sem ampliar a tolerância de engenharia.
- Faixas CNP usam o maior limite inferior, sem lacunas. Estimativa fora da curva falha em vez de saturar em 0/100 °C.
- Regina tem limites de mensagens/contexto/saída e timeout; cotas persistentes ainda são etapa futura.

## Validação
Local: node --experimental-vm-modules --test tests/*.test.mjs.
Os testes de funções usam os módulos reais com fronteiras Auth/SDK/HTTP simuladas; não substituem homologação com Supabase.
CI: fixtures/cálculos, funções, PostgreSQL 16 descartável com os dois históricos de migrações, build e tipos.
Bootstrap em tests/sql é EXCLUSIVO do banco descartável. Nunca aplicá-lo a Supabase real.

## Implantação em homologação
1. Fazer backup verificável e confirmar todas as migrações anteriores aplicadas: supabase/migrations cronologicamente e drizzle 0000..0006. A 0007 depende das duas árvores.
2. Executar os checks da branch; investigar qualquer falha. Não confundir execução de testes com aprovação do ambiente publicado.
3. Publicar save-calculation e change-password e as versões novas de manage-clients, provision-client e pet-chat em homologação. service_role permanece apenas nas variáveis do servidor.
4. Em janela controlada, aplicar drizzle/migrations/0007_access_and_calculation_integrity.sql pelo mecanismo de migração existente e publicar o frontend correspondente. A aplicação deve ficar indisponível durante a troca se clientes antigos ainda estiverem ativos: o modelo antigo de gravação de cálculos será negado após a migração.
5. Testar visitante, cliente A/B, manager, support e admin. Verificar sessão já emitida de conta desativada, senha pendente, convite e recovery. Confirmar que falha de Auth nunca libera a flag.
6. Salvar cálculo, comparar banco/UI/PDF e tentar enviar derivados adulterados. Validar regras de precisão/faixas com responsável técnico e planilha original.
7. Só promover após evidências dos testes reais. Esta branch não faz deploy ou migração automática.

A atualização direta de senha pelo SDK Auth não libera mais o primeiro acesso: o frontend precisa usar change-password. O endpoint não ignora exigências de senha/reauthentication configuradas no Auth. Falha de liberação após sucesso de Auth retorna 503 e informa que a credencial já foi atualizada; investigar e repetir com sessão válida.

## Limites desta etapa
Cobrança permanece desligada. Elegibilidade por assinatura, cotas persistentes da IA, fluxo comercial/webhooks, paginação, CSV, estado de sessão e dependências continuam no plano da auditoria.
Registros históricos não são recalculados nem alterados automaticamente. A geração local de arquivos continua sendo uma exportação, não uma assinatura digital ou atestado inviolável.
O lock npm original não é reproduzível; o job de aplicação usa npm install e a atualização do lock deve ser revisada na etapa de dependências.

## Reversão
Não reabrir escrita direta nem restaurar a RPC que dispensava a senha como solução de incidente. Em falha, manter o sistema em manutenção e corrigir/voltar a versão coordenada de frontend/funções/esquema em homologação primeiro. Preservar histórico e backup.
