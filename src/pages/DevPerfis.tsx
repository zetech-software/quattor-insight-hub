import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/useAuth";
import { AlertTriangle, Check, X } from "lucide-react";

type Perfil = {
  nome: string;
  email: string;
  papel: string;
  descricao: string;
  rotasLiberadas: string[];
  rotasBloqueadas: string[];
  acoes: { rotulo: string; permitido: boolean }[];
};

const PERFIS: Perfil[] = [
  {
    nome: "Admin",
    email: "admin@qu4ttuor.com.br",
    papel: "admin",
    descricao: "Acesso total ao sistema, incluindo ações sensíveis.",
    rotasLiberadas: ["/admin", "/admin/clientes", "/admin/relatorios", "/", "/historico", "/regina", "/chamados", "/suporte"],
    rotasBloqueadas: [],
    acoes: [
      { rotulo: "Ver painel, clientes e relatórios", permitido: true },
      { rotulo: "Convidar cliente", permitido: true },
      { rotulo: "Ativar / desativar qualquer conta", permitido: true },
      { rotulo: "Alterar plano e assinatura", permitido: true },
      { rotulo: "Excluir contas e cálculos", permitido: true },
      { rotulo: "Alterar permissões de outras contas", permitido: true },
      { rotulo: "Abrir chamado e acompanhar a caixa do suporte", permitido: true },
    ],
  },
  {
    nome: "Gestão",
    email: "(reservado, sem conta ativa)",
    papel: "manager",
    descricao: "Opera o dia a dia dos clientes, sem poder sobre contas, permissões e cobrança.",
    rotasLiberadas: ["/admin", "/admin/clientes", "/admin/relatorios", "/", "/historico", "/regina", "/chamados"],
    rotasBloqueadas: ["/suporte"],
    acoes: [
      { rotulo: "Ver painel, clientes e relatórios", permitido: true },
      { rotulo: "Convidar cliente", permitido: true },
      { rotulo: "Ativar / desativar cliente", permitido: true },
      { rotulo: "Alterar plano e assinatura", permitido: false },
      { rotulo: "Excluir contas e cálculos", permitido: false },
      { rotulo: "Alterar permissões de outras contas", permitido: false },
      { rotulo: "Qualquer ação sobre conta Admin ou Gestão", permitido: false },
    ],
  },
  {
    nome: "Suporte",
    email: "suporte@qu4ttuor.com.br",
    papel: "support",
    descricao: "Atende chamados. Não vê painel, clientes, relatórios, planos nem cálculos.",
    rotasLiberadas: ["/suporte"],
    rotasBloqueadas: ["/", "/historico", "/regina", "/admin", "/admin/clientes", "/admin/relatorios"],
    acoes: [
      { rotulo: "Ver todos os chamados e quem abriu", permitido: true },
      { rotulo: "Responder, anexar e registrar nota interna", permitido: true },
      { rotulo: "Assumir chamado, mudar situação e prioridade", permitido: true },
      { rotulo: "Painel, clientes, relatórios e planos", permitido: false },
      { rotulo: "Ver cálculos ou histórico de clientes", permitido: false },
      { rotulo: "Convidar, desativar ou excluir contas", permitido: false },
    ],
  },
  {
    nome: "Cliente",
    email: "enzo@zeregistra.com.br",
    papel: "client",
    descricao: "Vê apenas a própria operação. Nenhum bloco administrativo no menu.",
    rotasLiberadas: ["/", "/historico", "/regina", "/chamados"],
    rotasBloqueadas: ["/admin", "/admin/clientes", "/admin/relatorios", "/suporte"],
    acoes: [
      { rotulo: "Calculadora", permitido: true },
      { rotulo: "Histórico próprio", permitido: true },
      { rotulo: "Regina", permitido: true },
      { rotulo: "Abrir chamado e acompanhar os próprios", permitido: true },
      { rotulo: "Painel, clientes e relatórios", permitido: false },
      { rotulo: "Ver dados ou chamados de outros clientes", permitido: false },
    ],
  },
];

export default function DevPerfis() {
  const { user, role } = useAuth();

  return (
    <div className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="space-y-2">
          <Badge variant="secondary">Apoio a testes — apenas desenvolvimento</Badge>
          <h1 className="font-heading text-3xl font-bold text-foreground">Ambientes e perfis</h1>
          <p className="text-muted-foreground">
            Referência de qual conta usar e quais rotas conferir em cada perfil. Esta página não faz
            login, não guarda senha e não altera nenhuma permissão.
          </p>
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span>Sessão atual:</span>
            {user ? (
              <>
                <Badge variant="outline">{user.email}</Badge>
                <Badge>{role ?? "sem permissão"}</Badge>
              </>
            ) : (
              <Badge variant="outline">nenhuma sessão — entre em /login</Badge>
            )}
          </div>
        </header>

        <Card className="border-chart-warning/40">
          <CardContent className="flex gap-3 pt-6 text-sm text-muted-foreground">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-chart-warning" />
            <p>
              As senhas não ficam aqui nem em nenhum arquivo do projeto. Para testar, entre pela tela
              normal de acesso com a conta indicada e depois navegue pelas rotas listadas.
            </p>
          </CardContent>
        </Card>

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {PERFIS.map((p) => (
            <Card key={p.papel} className="flex flex-col">
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="font-heading">{p.nome}</CardTitle>
                  <Badge variant="outline">{p.papel}</Badge>
                </div>
                <CardDescription>{p.descricao}</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 space-y-4 text-sm">
                <div>
                  <p className="mb-1 font-medium text-foreground">Conta</p>
                  <p className="break-all text-muted-foreground">{p.email}</p>
                </div>

                <Separator />

                <div>
                  <p className="mb-2 font-medium text-foreground">Rotas liberadas</p>
                  <ul className="space-y-1">
                    {p.rotasLiberadas.map((r) => (
                      <li key={r}>
                        <Link to={r} className="text-primary underline-offset-4 hover:underline">
                          {r}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>

                {p.rotasBloqueadas.length > 0 && (
                  <div>
                    <p className="mb-2 font-medium text-foreground">Rotas bloqueadas</p>
                    <ul className="space-y-1 text-muted-foreground">
                      {p.rotasBloqueadas.map((r) => (
                        <li key={r}>{r} → devolve para a calculadora</li>
                      ))}
                    </ul>
                  </div>
                )}

                <Separator />

                <div>
                  <p className="mb-2 font-medium text-foreground">Ações</p>
                  <ul className="space-y-1.5">
                    {p.acoes.map((a) => (
                      <li key={a.rotulo} className="flex items-start gap-2">
                        {a.permitido ? (
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                        ) : (
                          <X className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                        )}
                        <span className={a.permitido ? "text-foreground" : "text-muted-foreground"}>
                          {a.rotulo}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-lg">Como testar</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>1. Saia da sessão atual pelo botão "Sair" do menu.</p>
            <p>2. Entre em /login com a conta do perfil que quer conferir.</p>
            <p>
              3. Confira o menu (o bloco administrativo aparece só para Admin e Gestão), abra cada
              rota liberada e digite as rotas bloqueadas na barra de endereço para ver o bloqueio.
            </p>
            <p>4. Em Gestão de Clientes, abra o menu de ações de uma linha e compare as opções.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
