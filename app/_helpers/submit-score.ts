export type Score = {
  player: string;
  score: number;
  depth: number;
  runTimeMs: number;
};

export async function submitScore(payload: Score): Promise<Response> {
  return fetch('/api/submit-score', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}