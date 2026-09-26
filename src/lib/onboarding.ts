export const onboardingGoals = [
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
] as const;

export type OnboardingGoalId = (typeof onboardingGoals)[number]["id"];

export type OnboardingProfile = {
  grade: 9 | 10;
  goals: OnboardingGoalId[];
};