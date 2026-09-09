# Auditoria final — correções propostas

Fiz a revisão completa do sistema (cálculos, telas, banco, segurança e qualidade de código). Os testes automatizados passam (83/83) e não há erros de compilação. Abaixo o que encontrei e o que proponho corrigir.

## 1. Valores que somem da tela quando são zero

Na Análise de Qualidade, quando a diferença entre DAC e DNF dá exatamente zero, a tela mostra "—" em vez de "0,000". O mesmo acontece com a densidade corrigida.
Correção: exibir o valor mesmo quando for zero (tela e PDF).

## 2. Diferença sempre zero no Resumo

Hoje a conta é: Volume Recebido = Volume NF + Situação da Seta, e depois Diferença = (Volume Recebido − Situação da Seta) − Volume NF. Isso dá **sempre zero**, e o Volume Atestado é **sempre igual ao Volume da NF**, em qualquer cenário.
Foi assim que ficou combinado nas últimas conversas (o exemplo 10.000 / +200 tinha que dar zero), então **não vou mudar sem sua confirmação**. Se a intenção era comparar o volume medido no tanque contra a NF, o campo da seta precisa ser um volume medido independente, não uma correção da própria NF. Me diga qual dos dois vale.

## 3. Acesso de cliente desativado

Ao desativar um cliente na tela de Gestão de Clientes, ele continua conseguindo entrar e usar a calculadora — o sistema não verifica esse status na entrada.
Correção: bloquear o acesso de contas desativadas, com aviso na tela de login.

## 4. Regras de acesso do banco (segurança)

- Regras duplicadas e sobrepostas em perfis e papéis de usuário: risco de divergirem numa alteração futura. Vou consolidar em uma regra por operação.
- Regras aplicadas ao público em vez de somente a usuários autenticados: vou restringir.
- Cálculos não têm regra de edição definida: vou adicionar uma regra explícita permitindo que cada pessoa edite apenas os próprios registros.
- Nenhum dado está exposto hoje; são ajustes preventivos.

## 5. Qualidade de código

19 apontamentos do verificador automático (tipos genéricos em relatórios, histórico e um componente de formulário). Vou corrigir todos os que estão em arquivos editáveis; os arquivos gerados automaticamente ficam como estão.

## Detalhes técnicos

- `src/pages/Index.tsx`: trocar checagens `valor ? x : undefined` por `valor != null` nos campos DAC 20°C e Diferença.
- `src/lib/pdfReports.ts`: mesma correção de zero; substituir `(doc as any).lastAutoTable` por helper tipado; usar `calc.municipio_base` (já existe em `types.ts`).
- `src/pages/Historico.tsx` e `src/pages/AdminRelatorios.tsx`: remover `any` (municipio_base tipado; `catch (err: unknown)`).
- `src/components/ui/textarea.tsx`: `TextareaProps` como `type` em vez de interface vazia.
- `src/hooks/useAuth.tsx`: incluir `is_active` no perfil; `src/components/ProtectedRoute.tsx`: encerrar sessão e redirecionar contas inativas.
- Nova migration: consolidar policies de `profiles` e `user_roles` (uma por comando, papel `authenticated`), adicionar `UPDATE` em `calculations` com `auth.uid() = user_id`.
- Manter `has_role` como SECURITY DEFINER (necessário para as policies; o alerta do scanner é esperado).
- Validação: `bunx vitest run`, `eslint`, novo scan de segurança.

## Fora do escopo até você decidir

O item 2 (fórmula da Diferença / Volume Atestado).
