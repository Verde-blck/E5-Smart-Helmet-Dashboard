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

/** The logo link is signed for an hour; refresh the branding before then. */
const BRANDING_REFRESH_MS = 50 * 60_000;

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

        // Standalone seeds its branding from env so nothing flashes unbranded,
        // then takes the company profile from the public /branding endpoint,
        // so the sign-in page carries E5's name, logo and colours too.
        if (!env.multiTenant) {
          try {
            const saved = await fetchBranding();
            applyBrandColors(saved.colors);
            setTenant({ id: saved.id, name: saved.name, logoUrl: saved.logoUrl, colors: saved.colors });
          } catch {
            // Backend unreachable: the env branding stands.
          }
        }

        // From the cached profile straight away; /auth/me confirms it.
        setUser(restoreSession());
      } catch {
        setUser(null);
      } finally {
        setBootstrapping(false);
      }
    }

    void bootstrap();
  }, [setTenant, setUser, setBootstrapping]);

  // The logo link expires after an hour, so fetch the branding again before
  // then. Also picks up changes another admin made meanwhile.
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

  // The company switched on "require 2FA" while this person was signed in:
  // the backend starts refusing with 2fa_setup_required. Flag it, and
  // RequireAuth takes them to the setup screen.
  useEffect(() => {
    const handle = () => {
      const user = useAuthStore.getState().user;
      if (user && !user.mustSetup2fa) setUser({ ...user, mustSetup2fa: true });
    };
    window.addEventListener("auth:2fa-setup-required", handle);
    return () => window.removeEventListener("auth:2fa-setup-required", handle);
  }, [setUser]);

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
