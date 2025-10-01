// Client-side OpenAI functionality (API calls go through backend)
export interface AIAnalysis {
  signal: 'buy' | 'sell' | 'hold';
  confidence: number;
  reasoning: string;
  entryPrice: number;
  targetPrice: number;
  stopLoss: number;
  riskReward: number;
}

export async function requestAIAnalysis(symbol: string): Promise<AIAnalysis> {
  const token = localStorage.getItem('firebase-token');
  const response = await fetch('/api/ai/analyze', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ symbol })
  });

  if (!response.ok) {
    throw new Error('AI analysis failed');
  }

  const data = await response.json();
  return data.analysis;
}
