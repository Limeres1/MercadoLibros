import { describe, expect, it, vi } from 'vitest';

import {
  AI_SELLER_SYSTEM_INSTRUCTION,
  buildSellerBookPrompt,
  generateBookProposal,
  parseAIBookProposal,
} from '@/features/seller/aiBookProposal';
import { askAI } from '@/services/ai';

vi.mock('@/services/ai', () => ({
  askAI: vi.fn(),
  AIError: class extends Error {},
}));

describe('aiBookProposal (D4)', () => {
  describe('buildSellerBookPrompt', () => {
    it('builds a prompt including title, author, genre, language, and sampleText', () => {
      const prompt = buildSellerBookPrompt({
        title: 'El Aleph',
        author: 'Jorge Luis Borges',
        genre: 'Cuentos',
        language: 'Español',
        sampleText: 'La candente mañana de febrero en que Beatriz Viterbo murió...',
      });

      expect(prompt).toContain('El Aleph');
      expect(prompt).toContain('Jorge Luis Borges');
      expect(prompt).toContain('Cuentos');
      expect(prompt).toContain('Español');
      expect(prompt).toContain('Beatriz Viterbo');
    });

    it('works with only title provided', () => {
      const prompt = buildSellerBookPrompt({ title: 'Rayuela' });
      expect(prompt).toContain('Rayuela');
      expect(prompt).not.toContain('Autor:');
    });
  });

  describe('parseAIBookProposal', () => {
    it('parses clean JSON into description, genre, and keywords', () => {
      const raw = JSON.stringify({
        description: 'Una fascinante obra de la literatura universal.',
        genre: 'Realismo Mágico',
        keywords: ['macondo', 'familia buendia', 'colombia'],
      });

      const result = parseAIBookProposal(raw);
      expect(result.description).toBe('Una fascinante obra de la literatura universal.');
      expect(result.genre).toBe('Realismo Mágico');
      expect(result.keywords).toEqual(['macondo', 'familia buendia', 'colombia']);
    });

    it('handles markdown code block wrappers (```json ... ```)', () => {
      const raw = `\`\`\`json
{
  "description": "Laberintos y espejos en Buenos Aires.",
  "genre": "Ficción",
  "keywords": ["borges", "filosofia"]
}
\`\`\``;

      const result = parseAIBookProposal(raw);
      expect(result.description).toBe('Laberintos y espejos en Buenos Aires.');
      expect(result.genre).toBe('Ficción');
      expect(result.keywords).toEqual(['borges', 'filosofia']);
    });

    it('falls back to standard genre if proposed genre is not in list', () => {
      const raw = JSON.stringify({
        description: 'Un libro sobre viajes espaciales.',
        genre: 'Genero Inexistente 123',
        keywords: ['espacio'],
      });

      const result = parseAIBookProposal(raw, 'Ciencia ficción');
      expect(result.genre).toBe('Ciencia ficción');
    });

    it('throws AIError if JSON is completely invalid', () => {
      expect(() => parseAIBookProposal('Respuesta en texto no json')).toThrow();
    });
  });

  describe('generateBookProposal', () => {
    it('throws error if title is empty', async () => {
      await expect(generateBookProposal({ title: '   ' })).rejects.toThrow(
        'Por favor indicá al menos el título de la obra',
      );
    });

    it('calls askAI with prompt, system instruction, and json=true', async () => {
      const mockResponse = JSON.stringify({
        description: 'Sinopsis de prueba',
        genre: 'Novela',
        keywords: ['drama', 'amor'],
      });
      vi.mocked(askAI).mockResolvedValueOnce(mockResponse);

      const result = await generateBookProposal({
        title: 'Ficciones',
        author: 'Jorge Luis Borges',
      });

      expect(askAI).toHaveBeenCalledWith({
        prompt: expect.stringContaining('Ficciones'),
        systemInstruction: AI_SELLER_SYSTEM_INSTRUCTION,
        json: true,
      });

      expect(result.description).toBe('Sinopsis de prueba');
      expect(result.genre).toBe('Novela');
      expect(result.keywords).toEqual(['drama', 'amor']);
    });
  });
});

