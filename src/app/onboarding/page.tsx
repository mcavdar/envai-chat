// src/app/onboarding/page.tsx

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthProvider, useAuth } from "@/providers/Auth";
import { Toaster } from "@/components/ui/sonner";
import { onboardingGoals } from "@/lib/onboarding";

function OnboardingForm() {
  const router = useRouter();
  const { fetch: authenticatedFetch } = useAuth();

  const [profileStatus, setProfileStatus] = useState<
    "checking" | "incomplete" | "error"
  >("checking");
  const [profileCheckAttempt, setProfileCheckAttempt] = useState(0);
  const [step, setStep] = useState(1);
  const [grade, setGrade] = useState<number | null>(null);
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function checkProfile() {
      setProfileStatus("checking");

      try {
        const response = await authenticatedFetch("/api/onboarding", {
          method: "GET",
          cache: "no-store",
        });

        if (!response.ok) throw new Error("Unable to check onboarding status");

        const result: unknown = await response.json();
        if (
          !result ||
          typeof result !== "object" ||
          !("profile" in result)
        ) {
          throw new Error("Invalid onboarding status response");
        }

        if (cancelled) return;

        if (result.profile === null) {
          setProfileStatus("incomplete");
        } else if (typeof result.profile === "object") {
          router.replace("/");
        } else {
          throw new Error("Invalid onboarding profile");
        }
      } catch {
        if (!cancelled) setProfileStatus("error");
      }
    }

    void checkProfile();

    return () => {
      cancelled = true;
    };
  }, [authenticatedFetch, profileCheckAttempt, router]);

  function toggleGoal(goal: string) {
    setSelectedGoals((current) =>
      current.includes(goal)
        ? current.filter((x) => x !== goal)
        : [...current, goal]
    );
  }

  async function finish() {
    if (!grade || selectedGoals.length === 0) return;

    setSaving(true);

    try {
      const response = await authenticatedFetch("/api/onboarding", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          grade,
          goals: selectedGoals,
        }),
      });

      if (!response.ok) {
        alert("Profil kaydedilemedi. Lütfen tekrar deneyin.");
        return;
      }

      router.replace("/");
    } catch {
      alert("Profil kaydedilemedi. Lütfen tekrar deneyin.");
    } finally {
      setSaving(false);
    }
  }

  if (profileStatus === "checking") {
    return (
      <main className="flex min-h-screen items-center justify-center p-8">
        <p>Profilin kontrol ediliyor...</p>
      </main>
    );
  }

  if (profileStatus === "error") {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
        <p>Profil kontrol edilemedi. Lütfen tekrar deneyin.</p>
        <button
          type="button"
          onClick={() => setProfileCheckAttempt((attempt) => attempt + 1)}
          className="rounded-xl bg-black px-6 py-3 text-white"
        >
          Tekrar dene
        </button>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-8">
      {step === 1 && (
        <section>
          <h1 className="text-3xl font-bold">
            Önce seni tanıyalım.
          </h1>

          <h2 className="mt-6 text-xl">
            Hangi sınıftasın?
          </h2>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {[9, 10].map((value) => (
              <button
                key={value}
                onClick={() => {
                  setGrade(value);
                  setStep(2);
                }}
                className="rounded-2xl border p-8 text-left hover:border-black"
              >
                <div className="text-2xl font-bold">
                  {value}. SINIF
                </div>

                <div className="mt-2 text-gray-500">
                  Matematik
                </div>

                <div className="mt-8 text-right text-2xl">
                  →
                </div>
              </button>
            ))}
          </div>

          <p className="mt-6 text-sm text-gray-500">
            Şimdilik yalnızca 9. ve 10. sınıf matematiğiyle başlıyoruz.
          </p>
        </section>
      )}

      {step === 2 && (
        <section>
          <button
            type="button"
            onClick={() => setStep(1)}
            className="mb-6 text-sm text-gray-600 hover:text-black"
          >
            ← Sınıf seçimine dön
          </button>
          <h1 className="text-3xl font-bold">
            Matematikte neyi başarmak istiyorsun?
          </h1>

          <p className="mt-3 text-gray-500">
            Birden fazla hedefi önem sırasına göre seçebilirsin.
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {onboardingGoals.map((goal) => {
              const selected = selectedGoals.includes(goal.id);

              return (
                <button
                  key={goal.id}
                  onClick={() => toggleGoal(goal.id)}
                  className={`rounded-2xl border p-6 text-left ${
                    selected
                      ? "border-black bg-gray-50"
                      : "border-gray-200"
                  }`}
                >
                  <div className="font-bold">
                    {goal.title}
                  </div>

                  <div className="mt-2 text-sm text-gray-500">
                    {goal.description}
                  </div>
                </button>
              );
            })}
          </div>

          <button
            disabled={selectedGoals.length === 0 || saving}
            onClick={finish}
            className="mt-8 rounded-xl bg-black px-6 py-3 text-white disabled:opacity-50"
          >
            {saving ? "Kaydediliyor..." : "Devam et"}
          </button>
        </section>
      )}
    </main>
  );
}

export default function OnboardingPage() {
  return (
    <>
      <Toaster />
      <AuthProvider>
        <OnboardingForm />
      </AuthProvider>
    </>
  );
}