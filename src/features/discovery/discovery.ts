/** Rule-based question-to-variable discovery (SRS VC-03 / SI-01 without a model).
 * Suggestions come only from the approved planned list. No data, provider, geocoder or
 * AI service is consulted, and the place and period are echoed, not applied.
 * Conversation turn shape adapted from Navida Jayaweera's SI chat flow at cabc793.
 */
import { plannedCatalog, type PlannedVariable } from '../catalog/plannedCatalog';

const vocabulary: Record<PlannedVariable['id'], readonly string[]> = {
  V01: ['air temperature', 'temperature', 'heat', 'heatwave', 'hot', 'warm', 'warming', 'cold', 'cool', 'climate', 'weather', 'desert', 'city', 'urban'],
  V02: ['precipitation', 'rainfall', 'rain', 'snowfall', 'drought', 'wet', 'dry', 'monsoon', 'flood', 'climate record', 'long-term', 'rain forest', 'rainforest', 'tropical', 'ocean', 'sea', 'coast', 'coastal'],
  V03: ['precipitation', 'rainfall', 'rain', 'storm', 'flood', 'monsoon', 'drought', 'satellite', 'high resolution', 'rain forest', 'rainforest', 'tropical'],
  V04: ['soil moisture', 'soil', 'moisture', 'drought', 'dry', 'wet', 'agriculture', 'crop', 'farm', 'land', 'desert', 'rain forest', 'rainforest'],
  V05: ['evapotranspiration', 'evaporation', 'transpiration', 'water cycle', 'plants', 'vegetation', 'forest', 'drought', 'humidity', 'rain forest', 'rainforest'],
  V06: ['runoff', 'river', 'flow', 'flood', 'catchment', 'basin', 'estuary', 'tidal', 'water'],
  V07: ['snow', 'snowpack', 'snow water', 'ice', 'glacier', 'mountain', 'melt', 'winter', 'himalaya'],
  V08: ['water vapour', 'water vapor', 'vapour', 'vapor', 'humidity', 'moisture', 'atmosphere', 'greenhouse', 'clouds', 'air'],
  V09: ['nitrogen dioxide', 'no2', 'pollution', 'air quality', 'smog', 'traffic', 'emissions', 'atmosphere', 'city', 'urban'],
  V10: ['aerosol', 'haze', 'smoke', 'dust', 'wildfire', 'fire', 'particles', 'sandstorm', 'pollution', 'air quality', 'atmosphere', 'desert', 'city', 'urban', 'ocean', 'sea', 'coast', 'coastal'],
  V11: ['chlorophyll', 'phytoplankton', 'algae', 'bloom', 'ocean', 'sea', 'marine', 'coast', 'coastal', 'estuary', 'tidal', 'fish'],
  V12: ['sunlight', 'solar', 'sun', 'radiation', 'shortwave', 'brightness', 'clouds', 'cloud'],
  V13: ['vegetation', 'greenness', 'ndvi', 'green', 'forest', 'rain forest', 'rainforest', 'deforestation', 'crop', 'farm', 'plants', 'desert', 'drought', 'tropical'],
};

const allTerms = [...new Set(Object.values(vocabulary).flat())].sort((a, b) => b.length - a.length);
const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const wordPattern = (term: string) => new RegExp(`(?<![a-z0-9])${escape(term)}s?(?![a-z0-9])`, 'g');
const maxKeywords = 8;
const maxSuggestions = 6;

export interface TopicIntent {
  keywords: string[];
  themes: PlannedVariable['theme'][];
  place: string | null;
  years: { start: number; end: number } | null;
}

export interface Suggestion {
  variable: PlannedVariable;
  score: number;
  matched: string[];
}

export function normalizeKeyword(text: string): string {
  return text.toLowerCase().replace(/\s+/g, ' ').trim();
}

/** Longest vocabulary terms win; matched spans never overlap, and results keep message order. */
export function extractKeywords(message: string): string[] {
  const text = normalizeKeyword(message);
  const taken: [number, number][] = [];
  const found: { term: string; at: number }[] = [];
  for (const term of allTerms) {
    for (const match of text.matchAll(wordPattern(term))) {
      const span: [number, number] = [match.index, match.index + match[0].length];
      if (taken.some(([from, to]) => span[0] < to && from < span[1])) continue;
      taken.push(span);
      found.push({ term, at: span[0] });
    }
  }
  return [...new Set(found.sort((a, b) => a.at - b.at).map(item => item.term))].slice(0, maxKeywords);
}

function extractPlace(message: string): string | null {
  const match = message.match(/\b(?:[Ii]n|[Oo]ver|[Aa]cross|[Nn]ear|[Aa]round|[Ff]or)\s+(?:the\s+)?([A-Z][\w'’-]*(?:\s+(?:of\s+)?[A-Z][\w'’-]*)*)/);
  return match ? match[1] : null;
}

function extractYears(message: string): TopicIntent['years'] {
  const years = [...message.matchAll(/\b(19[89]\d|20[0-4]\d)\b/g)].map(match => Number(match[1]));
  return years.length ? { start: Math.min(...years), end: Math.max(...years) } : null;
}

export function suggest(keywords: readonly string[]): Suggestion[] {
  const terms = keywords.map(normalizeKeyword).filter(Boolean);
  return plannedCatalog.map(variable => {
    const description = normalizeKeyword(`${variable.name} ${variable.summary} ${variable.definition} ${variable.product} ${variable.field} ${variable.theme}`);
    let score = 0;
    const matched: string[] = [];
    for (const term of terms) {
      const curated = vocabulary[variable.id].includes(term);
      const described = new RegExp(`(?<![a-z0-9])${escape(term)}s?(?![a-z0-9])`).test(description);
      if (!curated && !described) continue;
      matched.push(term);
      score += curated ? 3 : 1;
    }
    return { variable, score, matched };
  }).filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score || a.variable.id.localeCompare(b.variable.id))
    .slice(0, maxSuggestions);
}

export function interpretTopic(message: string): TopicIntent {
  const keywords = extractKeywords(message);
  const themes = [...new Set(suggest(keywords).map(item => item.variable.theme))];
  return { keywords, themes, place: extractPlace(message), years: extractYears(message) };
}
