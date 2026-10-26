import { useEffect } from "react";
import { useAuthStore } from "@/shared/store/authStore";
import { env } from "@/config/env";
import { features } from "@/config/features";
import { defaultTheme } from "@/config/theme.default";
import { applyBrandColors } from "@/shared/lib/color";
import { mockAdmin, mockTenant } from "@/shared/lib/mock-data";
import { apiClient } from "@/shared/lib/api-client";
import { restoreSession } from "@/modules/auth/api/auth.api";
import { endSession } from "@/shared/lib/session";
import { startRealtime, stopRealtime } from "@/app/realtime/realtime";
import { startMockHeartbeats } from "@/app/realtime/mock-heartbeats";
import { fetchBranding } from "@/modules/profile/api/profile.api";

const BRANDING_REFRESH_MS = 50 * 60_000;

export function AppBootstrap({ children }: { children: React.ReactNode }) {
  const setTenant = useAuthStore((s) => s.setTenant);
  const setUser = useAuthStore((s) => s.setUser);
  const setBootstrapping = useAuthStore((s) => s.setBootstrapping);
  const isBootstrapping = useAuthStore((s) => s.isBootstrapping);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  useEffect(() => {
    async function bootstrap() {
      if (env.useMocks) {
        applyBrandColors(mockTenant.colors);
        setTenant(mockTenant);
        setUser(mockAdmin);
        setBootstrapping(false);
        return;
      }

      try {
        if (env.multiTenant) {
          const subdomain = window.location.hostname.split(".")[0];
          const { data: tenant } = await apiClient.get(
            `/tenants/by-domain/${subdomain}`,
          );
          localStorage.setItem("tenantId", tenant.id);
          applyBrandColors(tenant.colors);
          setTenant(tenant);
        } else {
          applyBrandColors(defaultTheme.colors);
          setTenant({
            id: "standalone",
            name: defaultTheme.name,
            logoUrl: defaultTheme.logoUrl,
            colors: defaultTheme.colors,
          });
        }

        if (!env.multiTenant) {
          try {
            const saved = await fetchBranding();
            applyBrandColors(saved.colors);
            setTenant({ id: saved.id, name: saved.name, logoUrl: saved.logoUrl, colors: saved.colors });
          } catch {
            // Backend unreachable: the env branding stands.
          }
        }

        setUser(restoreSession());
      } catch {
        setUser(null);
      } finally {
        setBootstrapping(false);
      }
    }

    void bootstrap();
  }, [setTenant, setUser, setBootstrapping]);

  // Signed logo links expire after an hour, so refresh before then.
  useEffect(() => {
    if (env.useMocks || env.multiTenant) return;
    const id = setInterval(() => {
      void fetchBranding()
        .then((saved) => {
          applyBrandColors(saved.colors);
          setTenant({ id: saved.id, name: saved.name, logoUrl: saved.logoUrl, colors: saved.colors });
        })
        .catch(() => {});
    }, BRANDING_REFRESH_MS);
    return () => clearInterval(id);
  }, [setTenant]);

  useEffect(() => {
    const handle = () => {
      const user = useAuthStore.getState().user;
      if (user && !user.mustSetup2fa) setUser({ ...user, mustSetup2fa: true });
    };
    window.addEventListener("auth:2fa-setup-required", handle);
    return () => window.removeEventListener("auth:2fa-setup-required", handle);
  }, [setUser]);

  useEffect(() => {
    const handle = () => void endSession();
    window.addEventListener("auth:unauthorized", handle);
    return () => window.removeEventListener("auth:unauthorized", handle);
  }, []);

  // Keyed off authentication so the socket also starts after signing in through the form.
  useEffect(() => {
    if (!isAuthenticated) return;

    if (env.useMocks) return startMockHeartbeats();

    if (!features.realtimeSocket) return;

    startRealtime();
    return () => stopRealtime();
  }, [isAuthenticated]);

  if (isBootstrapping) {
    return (
      <div className="flex h-screen items-center justify-center text-slate-400">
        Loading…
      </div>
    );
  }

  return <>{children}</>;
}
