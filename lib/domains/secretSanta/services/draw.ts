/** Quem dá (`giver`) e quem recebe (`receiver`) o presente. */
export type SecretSantaPair = { giverUserId: string; receiverUserId: string };

/**
 * Sorteia os pares do Amigo Secreto: baralha os participantes (Fisher-Yates) e cada um dá ao
 * seguinte, o último ao primeiro. Esse ciclo único garante que ninguém se tira a si próprio e
 * que todos dão e recebem exatamente uma vez. `random` devolve um número em [0, 1); os testes
 * passam um com semente.
 */
export function drawSecretSanta(
  participantIds: readonly string[],
  random: () => number = Math.random,
): SecretSantaPair[] {
  // Remove repetidos e exige pelo menos duas pessoas.
  const participants = [...new Set(participantIds)];
  if (participants.length < 2) {
    throw new RangeError("Secret Santa needs at least 2 participants.");
  }

  // Baralha por Fisher-Yates.
  for (let index = participants.length - 1; index > 0; index--) {
    const swapIndex = Math.floor(random() * (index + 1));
    [participants[index], participants[swapIndex]] = [participants[swapIndex], participants[index]];
  }

  // Cada um dá ao seguinte; o último fecha o ciclo com o primeiro.
  return participants.map((giverUserId, index) => ({
    giverUserId,
    receiverUserId: participants[(index + 1) % participants.length],
  }));
}
