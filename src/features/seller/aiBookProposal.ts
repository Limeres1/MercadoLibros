import { BOOK_GENRES } from '@/constants/catalog';
import { AIError, askAI } from '@/services/ai';

export interface AIBookProposalInput {
  title: string;
  author?: string;
  genre?: string;
  language?: string;
  sampleText?: string;
}

export interface AIBookProposal {
  description: string;
  genre: string;
  keywords: string[];
}

export const AI_SELLER_SYSTEM_INSTRUCTION = `Sos un asistente editorial experto de la librería digital MercadoLibros.
Tu objetivo es ayudar a los vendedores a catalogar sus libros de forma profesional, atractiva y rápida.
A partir de los datos que te proporcione el vendedor (título, autor, fragmento o notas), debés proponer:
1. "description": Una sinopsis editorial atrapante y bien estructurada (entre 2 y 3 párrafos, máximo 1200 caracteres), que presente la premisa del libro e invite a la lectura sin spoilers.
2. "genre": El género literario más representativo de la obra. Elegí exactamente uno de esta lista oficial:
${BOOK_GENRES.join(', ')}.
3. "keywords": Un arreglo de entre 3 y 5 palabras clave o etiquetas temáticas relevantes (ej: ["literatura clásica", "aventura", "siglo xix"]).

Respondé exclusivamente con un objeto JSON válido con los campos: "description", "genre", y "keywords".`;

export function buildSellerBookPrompt(input: AIBookProposalInput): string {
  const parts = [
    `Proponé la sinopsis, género y palabras clave para el siguiente libro:`,
    `- Título: "${input.title.trim()}"`,
  ];

  if (input.author?.trim()) {
    parts.push(`- Autor: "${input.author.trim()}"`);
  }
  if (input.genre?.trim()) {
    parts.push(`- Género sugerido inicialmente: "${input.genre.trim()}"`);
  }
  if (input.language?.trim()) {
    parts.push(`- Idioma: "${input.language.trim()}"`);
  }
  if (input.sampleText?.trim()) {
    parts.push(`- Fragmento o notas de muestra: "${input.sampleText.trim().slice(0, 1000)}"`);
  }

  return parts.join('\n');
}

export function parseAIBookProposal(rawResponse: string, fallbackGenre = 'Ficción'): AIBookProposal {
  let cleaned = rawResponse.trim();
  // Limpiar posibles bloques de código markdown tipo ```json ... ```
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new AIError('La respuesta de la IA no tuvo el formato esperado. Podés completar la sinopsis a mano.');
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new AIError('La respuesta de la IA no contiene datos válidos.');
  }

  const candidate = parsed as Record<string, unknown>;

  const description =
    typeof candidate.description === 'string' && candidate.description.trim()
      ? candidate.description.trim()
      : 'Sinopsis generada automáticamente.';

  let genre = typeof candidate.genre === 'string' ? candidate.genre.trim() : fallbackGenre;
  // Si el género sugerido no está en la lista oficial, buscar si coincide ignorando mayúsculas o usar fallback
  const matchedGenre = BOOK_GENRES.find(g => g.toLowerCase() === genre.toLowerCase());
  genre =
    matchedGenre ?? (BOOK_GENRES.includes(fallbackGenre as (typeof BOOK_GENRES)[number]) ? fallbackGenre : 'Ficción');

  let keywords: string[] = [];
  if (Array.isArray(candidate.keywords)) {
    keywords = candidate.keywords
      .filter((k): k is string => typeof k === 'string' && k.trim().length > 0)
      .map(k => k.trim().replace(/^#+/, ''))
      .slice(0, 6);
  }

  if (keywords.length === 0) {
    keywords = [genre.toLowerCase()];
  }

  return { description, genre, keywords };
}

export async function generateBookProposal(input: AIBookProposalInput): Promise<AIBookProposal> {
  if (!input.title || !input.title.trim()) {
    throw new AIError('Por favor indicá al menos el título de la obra para generar la propuesta con IA.');
  }

  const prompt = buildSellerBookPrompt(input);
  const rawText = await askAI({
    prompt,
    systemInstruction: AI_SELLER_SYSTEM_INSTRUCTION,
    json: true,
  });

  return parseAIBookProposal(rawText, input.genre || 'Ficción');
}
