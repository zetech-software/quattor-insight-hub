/** Regra única de senha usada nas telas de definição e redefinição. */
export const MIN_PASSWORD_LENGTH = 8;

export const PASSWORD_RULE_TEXT =
  "Use ao menos 8 caracteres, com pelo menos uma letra e um número.";

/** Retorna a mensagem de erro em português, ou null se a senha for aceita. */
export function validatePassword(password: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `A senha deve ter ao menos ${MIN_PASSWORD_LENGTH} caracteres.`;
  }
  if (!/[A-Za-zÀ-ÿ]/.test(password)) {
    return "A senha deve conter ao menos uma letra.";
  }
  if (!/[0-9]/.test(password)) {
    return "A senha deve conter ao menos um número.";
  }
  return null;
}

/** Valida senha + confirmação em uma única checagem. */
export function validatePasswordPair(password: string, confirm: string): string | null {
  if (password !== confirm) return "As senhas não coincidem.";
  return validatePassword(password);
}

/** Traduz falhas de atualização de senha para texto amigável, sem expor mensagem crua. */
export function friendlyPasswordError(message: string | null | undefined): string {
  const raw = (message ?? "").toLowerCase();
  if (/weak|short|at least|password should/.test(raw)) {
    return PASSWORD_RULE_TEXT;
  }
  if (/same.*password|different from the old/.test(raw)) {
    return "A nova senha precisa ser diferente da anterior.";
  }
  if (/expired|invalid|token|jwt|session|401|403|not authenticated/.test(raw)) {
    return "O link de redefinição expirou ou já foi usado. Peça um novo link.";
  }
  if (/network|fetch|timeout|failed to send/.test(raw)) {
    return "Falha de conexão. Verifique sua internet e tente novamente.";
  }
  return "Não foi possível concluir. Tente novamente.";
}
