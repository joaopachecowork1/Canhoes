export type SecretSantaPair = { giverUserId: string; receiverUserId: string };

/**
 * Draws Secret Santa pairs: shuffles the participants (Fisher-Yates) and has each one give to
 * the next, the last giving to the first. That single cycle means nobody draws themselves and
 * everybody gives and receives exactly once. `random` returns a number in [0, 1); tests pass
 * a seeded one.
 */
export function drawSecretSanta(participantIds: readonly string[], random: () => number = Math.random): SecretSantaPair[] {
  const participants = [...new Set(participantIds)];
  if (participants.length < 2) {
    throw new RangeError("Secret Santa needs at least 2 participants.");
  }

  for (let index = participants.length - 1; index > 0; index--) {
    const swapIndex = Math.floor(random() * (index + 1));
    [participants[index], participants[swapIndex]] = [participants[swapIndex], participants[index]];
  }

  return participants.map((giverUserId, index) => ({
    giverUserId,
    receiverUserId: participants[(index + 1) % participants.length],
  }));
}
