# Recuperação de senha — implementar e validar apenas esse fluxo

Objetivo: dono, suporte e cliente conseguem redefinir a senha sozinhos, pelo e-mail oficial do sistema, sem senha temporária e sem mensagens técnicas.

## O que muda para quem usa

1. **Tela de entrada**: o link "Esqueceu a senha?" continua no mesmo lugar, mas a resposta passa a ser sempre neutra: "Se o e-mail estiver cadastrado, você receberá as instruções para redefinir sua senha." Nunca revela se a conta existe. Falha de rede mostra aviso claro com opção de tentar de novo.
2. **E-mail**: enviado pelo mecanismo oficial de recuperação, apontando para a tela de redefinição já existente. Nenhum código, token ou link aparece na tela.
3. **Tela de redefinição**: nova senha + confirmação, com aviso das regras (mínimo 8 caracteres, com letra e número), verificação de coincidência e mensagens amigáveis. Se o link estiver expirado, inválido ou já usado, a tela explica isso e oferece "Pedir novo link".
4. **Depois de redefinir**: mensagem de sucesso, encerramento da sessão temporária do link e volta para a tela de entrada, para o usuário entrar com a senha nova. Vale igual para dono, suporte e cliente.

Nada de permissões, perfis, chamados, cálculos, relatórios ou clientes é tocado.

## Detalhes técnicos

Arquivos alterados (apenas estes):

- `src/pages/Login.tsx` — resposta neutra no pedido de recuperação; tratamento de erro de rede sem vazar mensagem crua; e-mail normalizado (trim + minúsculas).
- `src/pages/ResetPassword.tsx` — validação do link baseada na sessão real de recuperação, não apenas na presença do hash:
  - aguarda `onAuthStateChange` com evento `PASSWORD_RECOVERY` e/ou `getSession()` (cobre link com hash `type=recovery` e link com `?code=` PKCE, já que `detectSessionInUrl` está ativo);
  - estados explícitos: `verificando`, `valido`, `invalido`;
  - mantém o caminho de convite (`type=invite`) intacto;
  - política de senha compartilhada, comparação com a confirmação, e mapeamento de erros para textos em português (senha fraca, senha igual à anterior, sessão ausente, link expirado, falha de rede);
  - em caso de sucesso: `signOut()` e `navigate("/login")`, evitando cair na regra de troca obrigatória.
- `src/lib/passwordPolicy.ts` (novo, pequeno) — regra única de validação de senha reutilizada por `ResetPassword.tsx` e `DefinirSenha.tsx`, com testes unitários.
- `src/pages/DefinirSenha.tsx` — apenas passa a usar a mesma regra de senha; nenhuma mudança de fluxo.
- `src/test/passwordPolicy.test.ts` (novo) — casos: senha curta, sem número, sem letra, válida, confirmação divergente.

Sem migração de banco. `must_change_password`, roles e políticas permanecem como estão; a recuperação não altera nenhuma flag de perfil.

## Validação

- Testes com Playwright no app rodando: pedido de recuperação para conta existente e para e-mail inexistente (mesma mensagem nos dois casos); tela de redefinição com link inválido; senhas divergentes; senha fraca.
- Verificação com sessão real de recuperação para as três contas (dono, suporte, cliente): definir senha nova, confirmar que a antiga deixa de funcionar, entrar com a nova, sair e entrar de novo. Ao final, cada senha é deixada em valor conhecido e informado a você em particular, ou restaurada, conforme sua preferência.
- Suíte completa (89 testes + os novos), verificação de tipos e build.
- Conferência final por `git status`/diff de que só os arquivos listados acima mudaram.

## Ponto que preciso confirmar

Para testar "senha antiga deixa de funcionar" eu preciso trocar de verdade a senha das três contas. Se preferir, testo o fluxo completo apenas com uma conta de teste temporária (criada e removida no mesmo trabalho) e faço nas contas oficiais somente a parte que não altera senha (envio do e-mail e validação da tela).
