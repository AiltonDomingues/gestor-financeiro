import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
} from "@tanstack/react-router";

import { AppShell } from "@/components/app-shell";
import { AppDataProvider } from "@/state/app-data-context";
import { PeriodProvider } from "@/state/period-context";
import { PinGate } from "@/components/pin-gate";
import { OnboardingGate } from "@/components/onboarding-gate";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="glass rounded-3xl max-w-md text-center p-10">
        <h1 className="text-6xl font-semibold tracking-tight">404</h1>
        <h2 className="mt-3 text-lg font-medium">Página não encontrada</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          O endereço acessado não existe ou foi movido.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition"
          >
            Voltar para o início
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="glass rounded-3xl max-w-md text-center p-10">
        <h1 className="text-lg font-semibold tracking-tight">Algo deu errado</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Não foi possível carregar esta página. Tente novamente.
        </p>
        <div className="mt-6 flex justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition"
          >
            Tentar novamente
          </button>
          <a
            href="/"
            className="rounded-xl border border-glass-border px-4 py-2 text-sm font-medium hover:bg-accent/40 transition"
          >
            Início
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <AppDataProvider>
        <PeriodProvider>
          <OnboardingGate>
            <PinGate>
              <AppShell>
                <Outlet />
              </AppShell>
            </PinGate>
          </OnboardingGate>
        </PeriodProvider>
      </AppDataProvider>
    </QueryClientProvider>
  );
}
