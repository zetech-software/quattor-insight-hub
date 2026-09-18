# Auditoria da página Perfil e edição de dados do cliente pelo Dono

## 1. Como está hoje

**Página Perfil (`/perfil`) — é a mesma para todos os perfis.** Aparece no menu de Cliente, Suporte e Dono, com o mesmo conteúdo:

- Bloco "Dados da empresa": Nome da empresa, CNPJ, Município, Estado (UF) — editáveis.
- Bloco "Dados do operador": Nome (obrigatório), Telefone — editáveis; E-mail apenas leitura.
- Bloco "Informações da conta" (somente leitura): situação ativa/inativa, perfil de acesso, plano/assinatura, data de cadastro.

Ou seja: **sim, Dono e Suporte veem hoje campos de empresa (CNPJ, município, UF) que só fazem sentido para cliente.** Eles salvam esses dados na própria linha, sem nenhum efeito prático no sistema.

**Tela Clientes (`/admin/clientes`) — hoje é só leitura de cadastro.**

- Apenas visualiza: nome do responsável, empresa, CNPJ, município/UF, telefone, e-mail, data de cadastro, último acesso, total de cálculos, últimos 5 cálculos, plano.
- Consegue alterar: situação ativa/inativa (Dono e Suporte) e plano Básico/Premium (só Dono).
- **Não existe nenhuma interface** para preencher ou corrigir empresa, CNPJ, município, UF, responsável ou telefone do cliente. O único momento em que o Dono informa dados do cliente é no convite (nome e empresa).

**Regras de banco hoje**

- Leitura de `profiles`: a própria linha, ou qualquer linha para equipe (Dono, Gestão, Suporte).
- Gravação de `profiles`: a própria linha, ou qualquer linha para Dono/Gestão. **Suporte não pode gravar em perfil de cliente pelo banco.**
- Trigger de proteção: quando o próprio usuário grava a sua linha e não é Dono/Gestão, campos sensíveis (ativa/inativa, troca obrigatória de senha, identificadores, data de criação) são ignorados.
- Papel, plano e assinatura continuam fora do alcance do cliente.
- Não existe tabela de auditoria de alterações.

## 2. O que está incoerente

1. Dono e Suporte editam "Dados da empresa" (CNPJ/município/UF) que nunca são usados para eles — parece cadastro de empresa cliente.
2. O Dono tem permissão no banco para corrigir o cadastro do cliente, mas não tem tela para isso: dado errado no convite só se corrige pedindo ao cliente.
3. O nome "Perfil" sugere perfil de empresa; para contas internas o correto é "Minha conta".
4. Suporte enxerga tudo do cliente e não pode corrigir nada de cadastro — hoje isso é coerente com a regra de segurança, mas precisa de decisão explícita.

## 3. Alteração mínima e mais segura (proposta)

**A. Perfil por tipo de conta (só apresentação)**

- Cliente: continua igual, com "Dados da empresa" e "Dados do operador".
- Dono e Suporte: a mesma página passa a se chamar **"Minha conta"** (menu e título) e mostra apenas Nome, Telefone, E-mail (leitura) e Informações da conta. O bloco de empresa deixa de aparecer e esses campos não são enviados ao salvar.
- Nenhuma mudança de permissão, banco ou rota. A rota `/perfil` continua a mesma.

**B. "Editar dados do cliente" na tela Clientes (somente Dono)**

- Novo botão dentro do painel lateral do cliente, abrindo um formulário com: Empresa, CNPJ, Município, UF, Responsável, Telefone.
- E-mail permanece somente leitura (continua vinculado ao acesso).
- Plano, papel, situação e permissões **ficam fora** do formulário, seguindo as ações administrativas atuais.
- Validações iguais às do Perfil do cliente (nome obrigatório, CNPJ com 14 números, UF com 2 letras, telefone com DDD).
- Suporte: **apenas visualiza** (sem o botão). Motivo: é a regra já vigente no banco; dar edição ao Suporte exigiria afrouxar a gravação de perfil e criar exceções — decisão que fica para você.

**C. Onde a gravação acontece**

A gravação usa a permissão que o Dono já tem no banco, sem nova função de servidor e sem chave de serviço. Se você quiser registro de auditoria ("quem alterou o quê e quando"), isso é um item separado — hoje não existe essa tabela.

## 4. Impactos verificados

- **Regras de leitura/gravação (RLS):** nenhuma mudança necessária. O Dono já pode gravar; o Suporte já não pode.
- **Trigger de proteção:** nenhuma mudança. Ele só age quando é o próprio usuário editando a própria linha.
- **Convites:** sem alteração; a correção de dados errados passa a ser feita na tela Clientes.
- **Perfil:** muda apenas o que é exibido conforme o perfil de acesso.
- **Auditoria:** hoje inexistente; permanece inexistente nesta alteração mínima.
- **Cálculos, fórmulas, Histórico, relatórios, Regina, Stripe:** nada é tocado.

## 5. Arquivos que seriam afetados

- `src/pages/Perfil.tsx` — título/menu "Minha conta" e ocultação do bloco de empresa para Dono/Suporte.
- `src/components/AppSidebar.tsx` — rótulo do item conforme o perfil.
- `src/components/admin/ClientDetailSheet.tsx` — botão e formulário "Editar dados do cliente" (só Dono).
- `src/pages/AdminClientes.tsx` — recarregar a lista após salvar.
- Sem migração de banco, sem alteração em `supabase/functions/manage-clients/index.ts`.

## 6. Decisões que preciso de você

1. Suporte apenas visualiza o cadastro (recomendado) ou também edita?
2. Quer registro de auditoria das alterações feitas pelo Dono?
3. O nome "Minha conta" está bom para Dono e Suporte?
