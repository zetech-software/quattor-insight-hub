

## Sistema SaaS Qu4ttuor — Cálculo de Recebimento de Diesel

### Visão Geral
Sistema web SaaS para a Qu4ttuor Consultoria que reproduz fielmente a planilha "Cálculo de Recebimento de Diesel" com duas visões: **Dashboard do Cliente** e **Dashboard Administrativo (Sócios)**.

### Design System
- Cores baseadas no site: laranja (#E8913A) como primária, cinza escuro (#333333) como foreground, fundo claro branco/cinza
- Tipografia moderna e limpa, estilo profissional/técnico
- Logo da Qu4ttuor no header/sidebar

---

### 1. Autenticação e Controle de Acesso

- **Login por email + senha** para todos os usuários
- **Sócios criam contas de clientes** via painel admin e enviam convite por email
- Dois perfis de acesso: `admin` (sócios) e `client` (clientes)
- Tabela `user_roles` com RLS para segurança

### 2. Dashboard do Cliente

**Calculadora de Recebimento de Diesel** — reproduz 100% da planilha:

- **Seção 1 — Informações da Nota Fiscal:** campos para Data, Nº NF, Placa do CT, Volume NF, Peso Líquido, Massa Específica a 20°C
- **Seção 2 — Estimativa da Temperatura de Carregamento:** cálculo automático do fator de correção (FCNF) e temperatura estimada usando a tabela auxiliar de fatores (Aba 2 da planilha)
- **Seção 3 — Análise de Qualidade do Produto:** campos para Temperatura da Amostra (TA) e Massa Específica da Amostra (DA), com cálculos automáticos de DAC 20°C e análise de qualidade
- **Seção 4 — Cálculo VCT:** Volume do produto na temperatura de recebimento com margens (-0,06% e +0,05%)
- **Seção 5 — Fator de Correção do CT:** Temperatura do CT (TCT), FCCT, Volume corrigido a 20°C
- **Painel Resumo lateral:** mostra Volume NF, Situação SETA, Volume Recebido, Volume Atestado, com indicador visual "Acima/Abaixo"
- **Todas as fórmulas** da planilha implementadas em JavaScript (tabelas de lookup incluídas)
- **Opção de salvar** cada cálculo no histórico ou rodar sem salvar
- **Histórico de cálculos** com lista, filtros por data, e possibilidade de reabrir cálculos anteriores

### 3. Dashboard Administrativo (Sócios)

- **Visão geral:** cards com total de clientes ativos/inativos, total de cálculos realizados
- **Gestão de clientes:** lista de clientes, status ativo/inativo, convidar novo cliente por email, desativar acesso
- **Métricas de uso:** gráficos de cálculos realizados por período (por cliente e total)
- **Gestão de assinaturas:** controle de plano/status de cada cliente (ativo, trial, expirado)
- **Relatórios exportáveis:** exportar dados de clientes e cálculos em PDF e Excel

### 4. Banco de Dados (Lovable Cloud / Supabase)

- Tabelas: `profiles`, `user_roles`, `clients`, `calculations` (histórico), `subscriptions`
- Tabela auxiliar com os fatores de correção volumétrica (dados das abas 2 e 3 da planilha)
- RLS em todas as tabelas

### 5. Estrutura de Páginas

- `/login` — Tela de login
- `/` — Dashboard do cliente (calculadora + histórico)
- `/historico` — Lista completa de cálculos salvos
- `/admin` — Dashboard administrativo
- `/admin/clientes` — Gestão de clientes
- `/admin/relatorios` — Relatórios e exportações
- Sidebar com navegação, collapsible

