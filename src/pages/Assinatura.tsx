import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Loader2, ShieldCheck } from "lucide-react";
import logo from "@/assets/qu4ttuor-logo.svg";
import {
  type PublicPlan,
  fetchPublicPlans,
  formatPlanPrice,
} from "@/lib/subscriptionPlans";

type Period = "mensal" | "anual";

const benefits = [
  "Cálculo de recebimento de diesel conforme a norma, com laudo pronto para conferência",
  "Histórico completo dos recebimentos, com filtros e exportação",
  "Relatórios de conferência em PDF e Excel",
  "Assistente Regina para dúvidas do dia a dia",
];

const Assinatura = () => {
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<PublicPlan[]>([]);
  const [billingReady, setBillingReady] = useState(false);
  const [period, setPeriod] = useState<Period>("mensal");

  useEffect(() => {
    let cancelled = false;
    fetchPublicPlans().then((result) => {
      if (cancelled) return;
      setPlans(result.plans);
      setBillingReady(result.billingReady);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const periodsAvailable = useMemo(
    () => Array.from(new Set(plans.map((p) => p.billing_period))),
    [plans],
  );

  const visiblePlans = useMemo(
    () =>
      periodsAvailable.length > 1
        ? plans.filter((p) => p.billing_period === period)
        : plans,
    [plans, period, periodsAvailable],
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <img src={logo} alt="Qu4ttuor Consultoria" className="h-9" />
          <Button asChild variant="outline" size="sm">
            <Link to="/login">Entrar</Link>
          </Button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-12 space-y-12">
        <section className="text-center space-y-4">
          <h1 className="text-3xl sm:text-4xl font-bold font-heading">
            Conferência de recebimento de diesel, sem retrabalho
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            A plataforma da Qu4ttuor calcula o volume corrigido do combustível recebido,
            aponta a diferença em relação à nota fiscal e organiza todos os registros da
            sua operação em um só lugar.
          </p>
        </section>

        <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {benefits.map((benefit) => (
            <div key={benefit} className="flex gap-3 items-start">
              <Check className="h-5 w-5 text-primary mt-0.5 shrink-0" />
              <p className="text-sm">{benefit}</p>
            </div>
          ))}
        </section>

        <section className="space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold font-heading">Planos</h2>
            {periodsAvailable.length > 1 && (
              <div className="inline-flex rounded-md border p-1 gap-1">
                {(["mensal", "anual"] as Period[]).map((option) => (
                  <Button
                    key={option}
                    size="sm"
                    variant={period === option ? "default" : "ghost"}
                    onClick={() => setPeriod(option)}
                  >
                    {option === "mensal" ? "Mensal" : "Anual"}
                  </Button>
                ))}
              </div>
            )}
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : visiblePlans.length === 0 ? (
            <Card className="max-w-2xl mx-auto">
              <CardHeader>
                <CardTitle className="font-heading text-xl">Planos em definição</CardTitle>
                <CardDescription>
                  Estamos preparando as opções de assinatura da Qu4ttuor. Os planos e
                  condições comerciais serão disponibilizados em breve.
                </CardDescription>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Já é cliente? <Link to="/login" className="text-primary underline">Acesse sua conta</Link>.
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {visiblePlans.map((plan) => {
                const price = formatPlanPrice(plan);
                return (
                  <Card
                    key={plan.code}
                    className={plan.is_recommended ? "border-primary shadow-md" : undefined}
                  >
                    <CardHeader className="space-y-2">
                      {plan.is_recommended && <Badge className="w-fit">Recomendado</Badge>}
                      <CardTitle className="font-heading text-lg">{plan.name}</CardTitle>
                      {plan.description && <CardDescription>{plan.description}</CardDescription>}
                      <p className="text-2xl font-bold font-heading">
                        {price ?? "—"}
                        <span className="text-sm font-normal text-muted-foreground">
                          {plan.billing_period === "anual" ? " /ano" : " /mês"}
                        </span>
                      </p>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <ul className="space-y-2 text-sm">
                        {plan.features.map((feature) => (
                          <li key={feature} className="flex gap-2">
                            <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                      <Button className="w-full" disabled={!billingReady}>
                        {billingReady ? "Assinar" : "Assinatura em breve"}
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </section>

        <section className="flex items-start gap-3 text-xs text-muted-foreground border-t pt-6">
          <ShieldCheck className="h-4 w-4 mt-0.5 shrink-0" />
          <p>
            Qu4ttuor Consultoria. Os dados informados são usados apenas para identificar a
            conta e organizar os registros e documentos gerados pela plataforma.
          </p>
        </section>
      </main>
    </div>
  );
};

export default Assinatura;
