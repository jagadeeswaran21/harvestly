export async function getTodayDemandSummary(): Promise<string> {
  const res = await fetch('https://api.a0.dev/ai/llm', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: [
        { role: 'system', content: 'You are an agricultural market analyst. Be concise (<=100 words).' },
        { role: 'user', content: "Give today's global crop demand highlights for staples (rice, wheat, corn, soybean). Include price/demand trend directions only." }
      ]
    })
  });
  const data = await res.json();
  return data.completion || 'Demand data unavailable.';
}

export type SoilAnalysisArgs = {
  imageUri?: string;
  ph: number;
  nitrogenLevel: string; // Low/Medium/High
  organicMatter: number; // %
  climate: { region: string; season: string };
};

export async function analyzeSoilAndRecommend(args: SoilAnalysisArgs): Promise<{ text: string; topRecommendation: string }> {
  const { imageUri, ph, nitrogenLevel, organicMatter, climate } = args;
  const prompt = `Analyze soil health and recommend top 3 crops.
Soil pH: ${ph}
Nitrogen: ${nitrogenLevel}
Organic matter: ${organicMatter}%
Region: ${climate.region}
Season: ${climate.season}
If pH is <5.5 or >8.0, note remediation. Provide bullet summary and a single best crop recommendation.`;
  const res = await fetch('https://api.a0.dev/ai/llm', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages: [ { role: 'system', content: 'You are an agronomist. Be practical and specific.' }, { role: 'user', content: prompt } ] })
  });
  const data = await res.json();
  const text: string = data.completion || 'No analysis available.';
  const match = text.match(/Best\s*crop\s*:?\s*(.*)/i);
  const topRecommendation = match ? match[1].trim() : 'See analysis';
  return { text, topRecommendation };
}

export async function getYieldAndRotationPlan(args: { crop: string; areaHa: number; location: string; history: string }): Promise<string> {
  const { crop, areaHa, location, history } = args;
  const user = `Create a concise yield prediction and 3-year rotation plan.
Crop: ${crop}
Area: ${areaHa} ha
Location: ${location}
Recent rotation: ${history}
Include: expected yield range with assumptions (climate normal), inputs recommendation, and rotation schedule (Year1-3). Keep <=150 words.`;
  const res = await fetch('https://api.a0.dev/ai/llm', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: [ { role: 'system', content: 'You are a farm planning assistant.' }, { role: 'user', content: user } ] })
  });
  const data = await res.json();
  return data.completion || 'No plan generated.';
}

export type AnalyzeSoilImageResult = {
  conditionSummary: string;
  climateSnapshot: string;
  recommendedCrops: string[];
  rotationPlan: string[];
  details: string;
};

export async function analyzeSoilImage(imageUri: string): Promise<AnalyzeSoilImageResult> {
  const user = `You are given a photograph of bare topsoil. Visually infer likely soil texture (sandy/loam/clay), drainage, organic matter indications, compaction, and moisture. Then:
- Soil condition: 1-2 sentences, practical.
- Climate snapshot: Assume season is current month and general temperate conditions; note risks (heat/drought/excess rain) generically.
- Recommended crops: top 3 globally common crops suited to the inferred soil condition.
- Rotation plan: 3 bullet lines (Year 1-3) including legumes where appropriate.
Return clear text. Keep total under 160 words.`;

  // For simplicity, pass the URI as context text. In production we could upload the image and pass a URL or base64.
  const res = await fetch('https://api.a0.dev/ai/llm', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
      messages: [
        { role: 'system', content: 'You are an agronomist. Be visual-first and pragmatic.' },
        { role: 'user', content: `${user}\nImage URI: ${imageUri}` }
      ]
    })
  });
  const data = await res.json();
  const text: string = data.completion || '';

  // Simple parsing heuristics to split sections
  const conditionMatch = text.match(/(Soil condition|Condition)[:\-]?\s*([\s\S]*?)(?:\n\n|\nClimate|\nRecommended)/i);
  const climateMatch = text.match(/(Climate snapshot|Climate)[:\-]?\s*([\s\S]*?)(?:\n\n|\nRecommended|\nRotation)/i);
  const recMatch = text.match(/(Recommended crops|Crops)[:\-]?\s*([\s\S]*?)(?:\n\n|\nRotation)/i);
  const rotMatch = text.match(/(Rotation plan|Rotation)[:\-]?\s*([\s\S]*)/i);

  const recs = recMatch ? recMatch[2].replace(/\n|\*/g, ' ').split(/,|•|\s{2,}/).map(s => s.trim()).filter(Boolean).slice(0,3) : [];
  const rotationLines = rotMatch ? rotMatch[2].split(/\n|•/).map(s => s.trim()).filter(Boolean).slice(0,3) : [];

  return {
    conditionSummary: conditionMatch ? conditionMatch[2].trim() : text.slice(0, 120),
    climateSnapshot: climateMatch ? climateMatch[2].trim() : 'Seasonal risks: heat/drought/rain vary by region; monitor forecasts.',
    recommendedCrops: recs.length ? recs : ['Maize (corn)', 'Soybean', 'Wheat'],
    rotationPlan: rotationLines.length ? rotationLines : ['Year 1: Legume (soybean) to build N', 'Year 2: Cereal (maize/wheat)', 'Year 3: Oilseed or root (canola/potato)'],
    details: text || 'Visual analysis unavailable.'
  };
}
