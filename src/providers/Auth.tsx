"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { toast } from "sonner";

type AuthContextValue = {
  accessToken: string | null;
  fetch: typeof globalThis.fetch;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);


function AuthForm() {
  const supabase = getSupabaseBrowserClient();
  const [isSignUp, setIsSignUp] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!supabase) {
    return (
      <main className="flex min-h-screen items-center justify-center p-6">
        <section className="w-full max-w-md rounded-xl border bg-card p-8 shadow-sm">
          <h1 className="text-2xl font-semibold">Kimlik doğrulama kullanılamıyor</h1>
          <p className="text-muted-foreground mt-2 text-sm">
            Giriş yapmak için NEXT_PUBLIC_SUPABASE_URL ve
            NEXT_PUBLIC_SUPABASE_ANON_KEY değerlerini yapılandırın.
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 p-6">
      <section className="w-full max-w-md rounded-xl border bg-card p-8 shadow-sm">
        <div className="mb-8">
          <p className="text-muted-foreground text-sm font-medium">Mento Chat</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            {isSignUp ? "Hesabınızı oluşturun" : "Tekrar hoş geldiniz"}
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">
            {isSignUp
              ? "Sohbetlerinizi gizli tutmak için bir hesap oluşturun."
              : "Sohbetlerinize devam etmek için giriş yapın."}
          </p>
        </div>
        <form
          className="flex flex-col gap-5"
          onSubmit={async (event) => {
            event.preventDefault();
            setIsSubmitting(true);
            const formData = new FormData(event.currentTarget);
            const email = String(formData.get("email") ?? "");
            const password = String(formData.get("password") ?? "");
            const result = isSignUp
              ? await supabase.auth.signUp({ email, password })
              : await supabase.auth.signInWithPassword({ email, password });

            setIsSubmitting(false);
            if (result.error) {
              toast.error(result.error.message);
              return;
            }
            if (isSignUp && !result.data.session) {
              toast.success("Hesabınızı onaylamak için e-postanızı kontrol edin.");
            }
          }}
        >
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">E-posta</Label>
            <Input id="email" name="email" type="email" autoComplete="email" required />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="password">Şifre</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete={isSignUp ? "new-password" : "current-password"}
              minLength={6}
              required
            />
          </div>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "İşleniyor..." : isSignUp ? "Hesap oluştur" : "Giriş yap"}
          </Button>
        </form>
        <button
          type="button"
          className="text-muted-foreground hover:text-foreground mt-6 w-full text-sm underline-offset-4 hover:underline"
          onClick={() => setIsSignUp((current) => !current)}
        >
          {isSignUp
            ? "Zaten bir hesabınız var mı? Giriş yapın"
            : "Hesabınız yok mu? Kayıt olun"}
        </button>
      </section>
    </main>
  );
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const supabase = getSupabaseBrowserClient();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (active) {
        setSession(data.session);
        setLoading(false);
      }
    });

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setLoading(false);
    });

    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, [supabase]);

  const signOut = useCallback(async () => {
    if (supabase) await supabase.auth.signOut();
  }, [supabase]);

  const authenticatedFetch = useCallback(
    async (input: RequestInfo | URL, init?: RequestInit) => {
      const headers = new Headers(init?.headers);
      if (session?.access_token && !headers.has("Authorization")) {
        headers.set("Authorization", `Bearer ${session.access_token}`);
      }
      const response = await globalThis.fetch(input, { ...init, headers });
      if (response.status === 401) await signOut();
      return response;
    },
    [session?.access_token, signOut],
  );

  const contextValue = useMemo(
    () => ({
      accessToken: session?.access_token ?? null,
      fetch: authenticatedFetch,
      signOut,
    }),
    [authenticatedFetch, session?.access_token, signOut],
  );

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center">Yükleniyor...</div>;
  }
  if (!session) return <AuthForm />;

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
