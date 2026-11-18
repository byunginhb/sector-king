import type { WeeklyMatchRound } from "./types";

export function getWeeklyMatchHomeState(
  rounds: WeeklyMatchRound[],
  now: number | null,
): {
  status: "preparing" | "open" | "closed" | "settled";
  round: WeeklyMatchRound | undefined;
} {
  const open =
    now === null
      ? undefined
      : rounds.find(
          (round) =>
            !round.settlement &&
            now >= Date.parse(round.opensAt) &&
            now < Date.parse(round.closesAt),
        );
  if (open) return { status: "open", round: open };
  const upcoming = rounds
    .filter(
      (round) =>
        !round.settlement && (now === null || now < Date.parse(round.opensAt)),
    )
    .sort((a, b) => Date.parse(a.opensAt) - Date.parse(b.opensAt))[0];
  if (upcoming) return { status: "preparing", round: upcoming };
  const pending = rounds
    .filter((round) => !round.settlement)
    .sort((a, b) => Date.parse(b.endsAt) - Date.parse(a.endsAt))[0];
  if (pending) return { status: "closed", round: pending };
  const settled = [...rounds].sort(
    (a, b) => Date.parse(b.endsAt) - Date.parse(a.endsAt),
  )[0];
  return { status: settled ? "settled" : "preparing", round: settled };
}
