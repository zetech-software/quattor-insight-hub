# Encerramento técnico e liberação
## Evidências automatizadas
- Instalação npm reproduzível a partir de package-lock atualizado.
- Tipos, testes Vitest, regressões das funções e motor, migrações/RLS em PostgreSQL e integração da interface com Playwright.
- Auditoria de dependências e revisão dos avisos restantes.
## Antes de publicar no ambiente existente
1. Confirmar projeto Supabase, conta Lovable, domínio, commit e plano de restauração.
2. Executar backup pelo mecanismo oficial, registrar versão de banco/funções e ensaiar restauração em ambiente separado.
3. Conferir migrações instaladas; aplicar 0007/0008 apenas se pendentes, em janela coordenada.
4. Publicar funções e frontend do mesmo commit. Testar login, convite/recovery em caixa de teste autorizada, troca de senha, cálculo/salvamento/histórico/PDF/Excel, cliente A/B e equipe.
5. Conferir autenticação pública desabilitada se o acesso deve ser apenas por convite, SMTP e origens permitidas. Habilitar MFA para equipe conforme política.
6. Monitorar erros e reservas de webhook pendentes/falhas. Reenviar eventos falhos no provedor após corrigir a causa. Não apagar event_id nem reabrir permissões para contornar incidente.
7. Verificar retenção das perguntas e payloads de pagamento conforme política de privacidade; definir agenda de limpeza antes da operação em escala. A função de serviço purge_operational_payloads recebe a data de corte aprovada; ela não é executada automaticamente e preserva os identificadores de eventos de pagamento.
8. Só ativar cobrança depois de aprovar catálogo, preços, políticas comerciais e cenários sandbox/produção, com evidência de homologação.
## Limites de validação
Testes de funções usam fronteiras de rede simuladas; Playwright usa API simulada e nunca acessa clientes reais. PostgreSQL de CI verifica permissões reais no banco descartável.
Esses testes não substituem validação com o Auth/SMTP/gateway reais, a planilha original ou responsabilidade técnica metrológica.
Sem acesso ao ambiente publicado, não é possível declarar implantação, backup/restore ou homologação de cobrança como concluídos.
