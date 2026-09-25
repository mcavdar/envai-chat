// src/app/onboarding/page.tsx

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const goals = [
  {
    id: "grades",
    title: "Notlarımı yükseltmek",
    description: "Yazılılarda daha iyi olmak istiyorum.",
  },
  {
    id: "gaps",
    title: "Eksiklerimi kapatmak",
    description: "Kaçırdığım konuları tamamlamak istiyorum.",
  },
  {
    id: "exam",
    title: "Sınava hazırlanmak",
    description: "Yaklaşan bir sınava hazırlanıyorum.",
  },
  {
    id: "improve",
    title: "Matematikte güçlenmek",
    description: "Sadece daha iyi olmak istiyorum.",
  },
];

export default function OnboardingPage() {
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [grade, setGrade] = useState<number | null>(null);
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

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

    const response = await fetch("/api/onboarding", {
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
      setSaving(false);
      alert("Bir hata oluştu.");
      return;
    }

    router.push("/chat");
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
          <h1 className="text-3xl font-bold">
            Matematikte neyi başarmak istiyorsun?
          </h1>

          <p className="mt-3 text-gray-500">
            Birden fazla hedef seçebilirsin.
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {goals.map((goal) => {
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