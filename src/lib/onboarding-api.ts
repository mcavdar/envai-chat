import {
  onboardingGoals,
  type OnboardingProfile,
} from "./onboarding";

export function isOnboardingProfile(value: unknown): value is OnboardingProfile {
  if (
    !value ||
    typeof value !== "object" ||
    !("grade" in value) ||
    !("goals" in value)
  ) {
    return false;
  }

  return (
    (value.grade === 9 || value.grade === 10) &&
    Array.isArray(value.goals) &&
    value.goals.every((goal) =>
      onboardingGoals.some((knownGoal) => knownGoal.id === goal),
    )
  );
}

export async function fetchOnboardingProfile(
  requestFetch: typeof globalThis.fetch,
): Promise<OnboardingProfile | null> {
  const response = await requestFetch("/api/onboarding", {
    method: "GET",
    cache: "no-store",
  });

  if (!response.ok) throw new Error("Unable to load onboarding profile");

  const result: unknown = await response.json();
  if (!result || typeof result !== "object" || !("profile" in result)) {
    throw new Error("Invalid onboarding profile response");
  }

  if (result.profile === null) return null;
  if (!isOnboardingProfile(result.profile)) {
    throw new Error("Invalid onboarding profile");
  }

  return result.profile;
}