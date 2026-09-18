/** Validações e regra de cadastro completo do cliente, usadas nas telas de perfil,
 *  de conclusão de cadastro e na edição feita pelo Dono. */

export interface ClientProfileFields {
  company_name: string | null;
  cnpj: string | null;
  municipio: string | null;
  uf: string | null;
  full_name: string | null;
  phone: string | null;
}

export const onlyDigits = (v: string) => v.replace(/\D/g, "");

const filled = (v: string | null | undefined) => !!v && v.trim().length > 0;

/** Cadastro empresarial completo: responsável, empresa, CNPJ, município, UF e telefone. */
export function isClientProfileComplete(p: ClientProfileFields | null | undefined): boolean {
  if (!p) return false;
  return (
    filled(p.full_name) &&
    filled(p.company_name) &&
    onlyDigits(p.cnpj ?? "").length === 14 &&
    filled(p.municipio) &&
    /^[A-Za-z]{2}$/.test((p.uf ?? "").trim()) &&
    [10, 11].includes(onlyDigits(p.phone ?? "").length)
  );
}

export type ClientProfileErrors = Partial<Record<keyof ClientProfileFields, string>>;

/** Valida os campos cadastrais. Com `required`, campos vazios também são recusados. */
export function validateClientProfile(
  form: Record<keyof ClientProfileFields, string>,
  options: { required?: boolean } = {},
): ClientProfileErrors {
  const required = options.required === true;
  const errors: ClientProfileErrors = {};

  if (!form.full_name.trim()) errors.full_name = "Informe o nome do responsável.";

  if (required && !form.company_name.trim()) {
    errors.company_name = "Informe o nome da empresa.";
  }

  if (!form.cnpj.trim()) {
    if (required) errors.cnpj = "Informe o CNPJ da empresa.";
  } else if (onlyDigits(form.cnpj).length !== 14) {
    errors.cnpj = "O CNPJ deve ter 14 números.";
  }

  if (required && !form.municipio.trim()) {
    errors.municipio = "Informe o município.";
  }

  if (!form.uf.trim()) {
    if (required) errors.uf = "Informe o estado (UF).";
  } else if (!/^[A-Za-z]{2}$/.test(form.uf.trim())) {
    errors.uf = "Use a sigla do estado, com 2 letras (ex.: SP).";
  }

  const phoneDigits = onlyDigits(form.phone);
  if (!form.phone.trim()) {
    if (required) errors.phone = "Informe o telefone com DDD.";
  } else if (phoneDigits.length < 10 || phoneDigits.length > 11) {
    errors.phone = "Informe o telefone com DDD (10 ou 11 números).";
  }

  return errors;
}
