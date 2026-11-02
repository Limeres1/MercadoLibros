import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  AI_PROPOSAL_ERRORS,
  AI_SELLER_SYSTEM_INSTRUCTION,
  buildSellerBookPrompt,
  generateBookProposal,
  mergeKeywords,
  parseAIBookProposal,
} from '@/features/seller/aiBookProposal';
import { askAI } from '@/services/ai';

vi.mock('@/services/ai', () => ({ askAI: vi.fn(), AIError: class extends Error {} }));

describe('aiBookProposal', () => {
  beforeEach(() => vi.clearAllMocks());

  it('builds the prompt from the filled fields and a bounded excerpt', () => {
    const prompt = buildSellerBookPrompt({
      title: ' El Aleph ',
      author: 'Borges',
      language: 'Español',
      excerpt: `La candente mañana de febrero${'.'.repeat(5000)}`,
    });
    expect(prompt).toContain('Título: El Aleph');
    expect(prompt).toContain('Autor: Borges');
    expect(prompt).toContain('La candente mañana de febrero');
    expect(prompt).not.toContain('Género elegido');
    expect(prompt.length).toBeLessThan(3200);
  });

  it('keeps the system instruction inside the server limit', () => {
    expect(AI_SELLER_SYSTEM_INSTRUCTION.length).toBeLessThanOrEqual(2000);
  });

  it('parses the proposal, even inside a markdown block', () => {
    const raw =
      '```json\n{"description":" Laberintos. ","genre":"cuentos","keywords":["#Borges","  Buenos   Aires ","borges",3]}\n```';
    expect(parseAIBookProposal(raw, 'Ficción')).toEqual({
      description: 'Laberintos.',
      genre: 'Cuentos',
      keywords: ['borges', 'buenos aires'],
    });
  });

  it('keeps the seller genre when the AI invents one', () => {
    const raw = JSON.stringify({ description: 'Viajes espaciales.', genre: 'Space opera', keywords: [] });
    expect(parseAIBookProposal(raw, 'Ciencia ficción').genre).toBe('Ciencia ficción');
  });

  it('CA-2: rejects answers without a usable synopsis instead of inventing one', () => {
    expect(() => parseAIBookProposal('no es json', 'Ficción')).toThrow(AI_PROPOSAL_ERRORS.invalidResponse);
    expect(() => parseAIBookProposal('{"description":"  "}', 'Ficción')).toThrow(AI_PROPOSAL_ERRORS.invalidResponse);
  });

  it('limits the merged keywords', () => {
    const added = Array.from({ length: 12 }, (_slot, index) => `tema ${index}`);
    expect(mergeKeywords(['tema 0'], added)).toHaveLength(8);
    expect(mergeKeywords([], ['x'.repeat(60)])[0]).toHaveLength(40);
  });

  it('asks for JSON and does not call the AI without a title', async () => {
    await expect(generateBookProposal({ title: '  ' })).rejects.toThrow(AI_PROPOSAL_ERRORS.missingTitle);
    expect(askAI).not.toHaveBeenCalled();

    vi.mocked(askAI).mockResolvedValueOnce('{"description":"Sinopsis","genre":"Novela","keywords":["amor"]}');
    await expect(generateBookProposal({ title: 'Rayuela', genre: 'Ficción' })).resolves.toEqual({
      description: 'Sinopsis',
      genre: 'Novela',
      keywords: ['amor'],
    });
    expect(askAI).toHaveBeenCalledWith({
      prompt: expect.stringContaining('Rayuela'),
      systemInstruction: AI_SELLER_SYSTEM_INSTRUCTION,
      json: true,
    });
  });
});
