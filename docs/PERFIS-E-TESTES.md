# Perfis
- admin: administração, relatórios e clientes; Regina indisponível.
- manager: painel/relatórios e gestão limitada de clientes; não altera equipe nem assinatura.
- support: consulta e operações de convite/atividade de clientes pela função; sem planos/permissões.
- client: cálculos e histórico próprios; sem área administrativa.
Papéis múltiplos na interface têm prioridade admin > manager > support > client. O servidor sempre verifica o conjunto completo de papéis.
Todos os perfis exigem atividade e senha definida para operações. Equipe é isenta de assinatura.
Cliente sem assinatura tem acesso manual. Assinatura vencida/cancelada/prazo encerrado bloqueia.
Testar URLs diretas e APIs, incluindo dois clientes diferentes, sessão já emitida de conta desativada e tentativa de alterar equipe por Gestão.
