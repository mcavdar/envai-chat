"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, LoaderCircle, Save } from "lucide-react";
import { toast } from "sonner";
import { AuthProvider, useAuth } from "@/providers/Auth";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import {
  onboardingGoals,
  type OnboardingGoalId,
  type OnboardingProfile,
} from "@/lib/onboarding";
import { fetchOnboardingProfile } from "@/lib/onboarding-api";

function ProfileForm() {
  const router = useRouter();
  const { email, fetch: authenticatedFetch } = useAuth();
  const [profile, setProfile] = useState<OnboardingProfile | null>(null);
  const [grade, setGrade] = useState<OnboardingProfile["grade"] | null>(null);
  const [selectedGoals, setSelectedGoals] = useState<OnboardingGoalId[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      setLoading(true);

      try {
        const loadedProfile = await fetchOnboardingProfile(authenticatedFetch);

        if (cancelled) return;

        if (loadedProfile === null) {
          router.replace("/onboarding");
          return;
        }

        setProfile(loadedProfile);
        setGrade(loadedProfile.grade);
        setSelectedGoals(loadedProfile.goals);
      } catch {
        if (!cancelled) toast.error("Profil yüklenemedi. Lütfen tekrar deneyin.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadProfile();

    return () => {
      cancelled = true;
    };
  }, [authenticatedFetch, loadAttempt, router]);

  function toggleGoal(goal: OnboardingGoalId) {
    setSelectedGoals((current) =>
      current.includes(goal)
        ? current.filter((selected) => selected !== goal)
        : [...current, goal],
    );
  }

  async function saveProfile() {
    if (!grade || selectedGoals.length === 0) return;

    setSaving(true);
    try {
      const response = await authenticatedFetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ grade, goals: selectedGoals }),
      });
      if (!response.ok) throw new Error("Unable to save profile");

      const updatedProfile = { grade, goals: selectedGoals };
      setProfile(updatedProfile);
      toast.success("Profil güncellendi.");
    } catch {
      toast.error("Profil kaydedilemedi. Lütfen tekrar deneyin.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center p-6">
        <p>Profil yükleniyor...</p>
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-6">
        <p>Profil yüklenemedi.</p>
        <Button variant="outline" onClick={() => setLoadAttempt((count) => count + 1)}>
          Tekrar dene
        </Button>
      </main>
    );
  }

  const hasChanges =
    grade !== profile.grade ||
    selectedGoals.length !== profile.goals.length ||
    selectedGoals.some((goal) => !profile.goals.includes(goal));

  return (
    <main className="min-h-screen px-5 py-8 sm:px-8">
      <div className="mx-auto max-w-2xl">
        <Link
          href="/"
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-2 text-sm"
        >
          <ArrowLeft className="size-4" />
          Sohbete dön
        </Link>

        <header className="mt-8 border-b pb-6">
          <p className="text-muted-foreground text-sm">HESAP</p>
          <h1 className="mt-2 text-3xl font-semibold">Profil ayarları</h1>
          <div className="mt-6">
            <p className="text-muted-foreground text-sm">E-posta</p>
            <p className="mt-1 break-all font-medium">{email ?? "E-posta mevcut değil"}</p>
          </div>
        </header>

        <section className="border-b py-7">
          <h2 className="text-lg font-semibold">Sınıf</h2>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {([9, 10] as const).map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={grade === value}
                onClick={() => setGrade(value)}
                className={`min-h-14 border px-4 text-left transition-colors ${
                  grade === value
                    ? "border-foreground bg-muted"
                    : "border-border hover:border-foreground/50"
                }`}
              >
                <span className="font-semibold">{value}. sınıf</span>
              </button>
            ))}
          </div>
        </section>

        <section className="py-7">
          <h2 className="text-lg font-semibold">Matematik hedefleri</h2>
          <div className="mt-4 divide-y border-y">
            {onboardingGoals.map((goal) => {
              const selected = selectedGoals.includes(goal.id);
              return (
                <button
                  key={goal.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => toggleGoal(goal.id)}
                  className="flex w-full items-start gap-4 py-4 text-left"
                >
                  <span
                    aria-hidden="true"
                    className={`mt-1 size-4 shrink-0 border ${
                      selected ? "border-foreground bg-foreground" : "border-muted-foreground"
                    }`}
                  />
                  <span>
                    <span className="block font-medium">{goal.title}</span>
                    <span className="text-muted-foreground mt-1 block text-sm">
                      {goal.description}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
          {selectedGoals.length === 0 && (
            <p className="text-destructive mt-3 text-sm">
              Seçili en az bir hedef olmalı.
            </p>
          )}
        </section>

        <div className="flex justify-end border-t pt-5">
          <Button
            onClick={saveProfile}
            disabled={!hasChanges || !grade || selectedGoals.length === 0 || saving}
          >
            {saving ? (
              <LoaderCircle className="animate-spin" />
            ) : (
              <Save />
            )}
            Kaydet
          </Button>
        </div>
      </div>
    </main>
  );
}

export default function ProfilePage() {
  return (
    <>
      <Toaster />
      <AuthProvider>
        <ProfileForm />
      </AuthProvider>
    </>
  );
}