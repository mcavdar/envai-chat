import { expect, test } from "@playwright/test";
import { fetchOnboardingProfile } from "../src/lib/onboarding-api";

function mockFetch(payload: unknown): typeof fetch {
  return async () =>
    new Response(JSON.stringify(payload), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
}

test("returns null when no onboarding profile exists", async () => {
  await expect(
    fetchOnboardingProfile(mockFetch({ profile: null })),
  ).resolves.toBeNull();
});

test("returns a validated onboarding profile", async () => {
  const profile = { grade: 10, goals: ["grades", "exam"] };

  await expect(
    fetchOnboardingProfile(mockFetch({ profile })),
  ).resolves.toEqual(profile);
});

test("rejects malformed onboarding profiles", async () => {
  await expect(
    fetchOnboardingProfile(mockFetch({ profile: { grade: 11, goals: [] } })),
  ).rejects.toThrow("Invalid onboarding profile");
});

test("rejects unsuccessful onboarding responses", async () => {
  const requestFetch: typeof fetch = async () => new Response(null, { status: 500 });

  await expect(fetchOnboardingProfile(requestFetch)).rejects.toThrow(
    "Unable to load onboarding profile",
  );
});