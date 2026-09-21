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

// Resolves tenant + session ONCE on app load, before any routes render.
// This is the one place that branches on SaaS vs standalone — everything
// downstream just reads from the auth store and doesn't know which mode
// it's in.
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
          // SaaS: resolve tenant from subdomain, e.g. acme.yourapp.com
          const subdomain = window.location.hostname.split(".")[0];
          const { data: tenant } = await apiClient.get(
            `/tenants/by-domain/${subdomain}`,
          );
          localStorage.setItem("tenantId", tenant.id);
          applyBrandColors(tenant.colors);
          setTenant(tenant);
        } else {
          // Standalone: single tenant baked in via env vars at deploy time
          applyBrandColors(defaultTheme.colors);
          setTenant({
            id: "standalone",
            name: defaultTheme.name,
            logoUrl: defaultTheme.logoUrl,
            colors: defaultTheme.colors,
          });
        }

        // No /auth/me endpoint: the session is reconstructed from the stored
        // token, which carries the username and expiry in its payload.
        setUser(restoreSession());

        // Standalone seeds its branding from env so the login screen is already
        // branded, but the saved tenant profile wins once a session exists.
        // Without this, editing the company name would silently do nothing in
        // one of the two deployment modes we have to support.
        if (!env.multiTenant) {
          try {
            const { data: saved } = await apiClient.get("/tenant/profile");
            applyBrandColors(saved.colors);
            setTenant({
              id: saved.id ?? "standalone",
              name: saved.name,
              logoUrl: saved.logoUrl ?? "",
              colors: saved.colors,
            });
          } catch {
            // No profile saved yet, or the endpoint isn't built — env stands.
            // Expected against the current backend; not an error.
          }
        }
      } catch {
        setUser(null);
      } finally {
        setBootstrapping(false);
      }
    }

    void bootstrap();
  }, [setTenant, setUser, setBootstrapping]);

  // A 401 on any later request means the session died mid-use. api-client
  // dispatches this; previously nothing listened, so the user sat looking at a
  // broken page. Clearing auth is enough — RequireAuth handles the redirect.
  useEffect(() => {
    const handle = () => void endSession();
    window.addEventListener("auth:unauthorized", handle);
    return () => window.removeEventListener("auth:unauthorized", handle);
  }, []);

  // Keyed off authentication rather than called inside bootstrap(), so the
  // socket also starts for someone who arrives via the login form. Previously
  // realtime only came up on a full page load after the cookie already existed.
  useEffect(() => {
    if (!isAuthenticated) return;

    if (env.useMocks) return startMockHeartbeats();

    // The dashboard has no WebSocket to connect to — /ws on the backend is
    // the helmets' own channel. Polling covers it; see config/features.ts.
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
