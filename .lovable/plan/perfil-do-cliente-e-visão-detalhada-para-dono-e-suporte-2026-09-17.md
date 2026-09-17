# Perfil do Cliente e visão detalhada para Dono e Suporte

## Auditoria do que já existe (verificado no banco)

Cadastro atual (`profiles`): nome do responsável, nome da empresa, telefone, foto, situação ativa/inativa, troca obrigatória de senha, datas de criação e atualização.

Não existe hoje: CNPJ, município, estado, endereço, razão social, nome fantasia, cargo.
Assinatura fica em `subscriptions` (plano, situação, início, vencimento). Papel fica em `user_roles`. O e-mail fica na área de autenticação, fora do cadastro.

Falha real encontrada na segurança: a regra atual de gravação do cadastro permite ao próprio usuário alterar **qualquer** coluna da sua linha — inclusive "conta ativa" e "troca obrigatória de senha". Hoje nenhuma tela oferece isso, mas por fora da interface passaria. Será corrigido.

## 1. Tela "Perfil" do Cliente (`/perfil`)

Novo item "Perfil" no menu, visível para todos os perfis (o Dono e o Suporte também têm cadastro próprio).

Dois blocos, seguindo o design atual, tema claro/escuro e responsivo:

- **Dados da empresa** — Nome da empresa, CNPJ, Município, Estado (UF).
- **Dados do operador** — Nome, E-mail (somente leitura, vem da autenticação), Telefone.

Somente leitura, exibidos sem edição: plano/assinatura (ou "Sem assinatura registrada"), situação da conta, perfil de acesso e data de cadastro.

Botão "Salvar alterações", confirmação de sucesso, validações claras (nome obrigatório, CNPJ com 14 dígitos quando preenchido, UF de 2 letras, telefone com formato aceito) e nenhuma mensagem técnica do banco.

## 2. Campos novos (mínimo necessário)

Três colunas novas em `profiles`, todas opcionais: `cnpj`, `municipio`, `uf`. Nenhuma outra estrutura criada. Sem endereço, razão social, nome fantasia ou cargo.

## 3. Segurança (servidor, não só tela)

- Nova regra de banco (trigger) que, quando quem grava é o próprio usuário e não é Dono/Gestão, recusa alteração de: situação ativa/inativa, troca obrigatória de senha, identificador, dono da linha e data de criação. Só nome, empresa, telefone, CNPJ, município, UF e foto passam.
- As regras de leitura e gravação existentes não são recriadas: já garantem que o cliente lê e grava apenas a própria linha, e que Dono/Suporte leem todos.
- Cliente continua sem poder alterar papel, plano, assinatura ou permissões (regras atuais já bloqueiam).
- Suporte **não** ganha nenhuma permissão nova.

## 4. Visão detalhada do cliente (Dono e Suporte)

Na tela de Gestão de Clientes, a linha do cliente passa a ser clicável e abre um **painel lateral** (sem rota nova, sem duplicar tela) com:

- Dados principais: nome, e-mail, empresa, CNPJ, município/UF, telefone, situação ativa/inativa, perfil, data de cadastro.
- Dados operacionais: total de cálculos, data do último cálculo e os 5 cálculos mais recentes (data, NF, placa, diferença, situação).
- Plano: só se houver assinatura registrada; caso contrário "Sem assinatura registrada" (a lista deixa de mostrar "Básico/Trial" inventado quando não existe assinatura).
- Ações no painel conforme a permissão atual: ativar/desativar (Dono e Suporte, apenas contas de cliente) e plano (só Dono). Nada de novo.

O e-mail do cliente é obtido pela função de servidor já existente de gestão de clientes, que passa a devolver o e-mail apenas para quem já tem permissão administrativa — sem abrir leitura direta da área de autenticação para o navegador.

## Detalhes técnicos

- Migração: `ALTER TABLE public.profiles ADD COLUMN cnpj text, municipio text, uf text` + função/trigger `enforce_profile_self_update_rules` (BEFORE UPDATE) protegendo colunas sensíveis quando `auth.uid() = OLD.user_id` e sem `has_admin_area_access`.
- Novo `src/pages/Perfil.tsx`; rota `/perfil` em `src/App.tsx` dentro de `ProtectedRoute`.
- `src/components/AppSidebar.tsx`: item "Perfil".
- Novo `src/components/admin/ClientDetailSheet.tsx` (Sheet do shadcn) usado por `src/pages/AdminClientes.tsx`; linha clicável + item "Ver detalhes" no menu existente.
- `src/pages/AdminClientes.tsx`: remover o fallback "Básico"/"trial" quando não há assinatura; carregar CNPJ/município/UF/telefone no `select`.
- `supabase/functions/manage-clients/index.ts`: nova ação `client-details` (só admin/manager/support) devolvendo e-mail e último acesso do usuário-alvo.
- Sem alterações em fórmulas, calculadora, histórico, Regina, exportações, aviso legal, autenticação, convites ou estrutura do Suporte.

## Testes

Cliente: abrir Perfil, editar, salvar, F5, campo inválido, tentativa de alterar campo sensível por fora da tela, tentativa de ler/editar outro usuário, telas de 390 px e 430 px.
Dono e Suporte: abrir detalhes, conferir dados e indicadores, ativar/desativar cliente; Suporte recusado em plano, papel e exclusão.
Geral: acesso direto por URL, F5, logout, tema claro/escuro, console e rede limpos. Mais os 99 testes automatizados, verificação de tipos e build de produção.
