import { describe, it, expect } from 'vitest';
import {
  getPlayerScoreFromFrbeResult,
  formatBoardResult,
} from '../performance';

describe('Performance Domain - getPlayerScoreFromFrbeResult', () => {
  describe('Home player perspective', () => {
    it('returns 1 when home player wins (1-0 or 1-0 FF)', () => {
      expect(getPlayerScoreFromFrbeResult('1-0', true)).toBe(1);
      expect(getPlayerScoreFromFrbeResult('1-0 FF', true)).toBe(1);
    });

    it('returns 0 when home player loses (0-1 or 0-1 FF)', () => {
      expect(getPlayerScoreFromFrbeResult('0-1', true)).toBe(0);
      expect(getPlayerScoreFromFrbeResult('0-1 FF', true)).toBe(0);
    });

    it('returns 0.5 on a draw', () => {
      expect(getPlayerScoreFromFrbeResult('½-½', true)).toBe(0.5);
      expect(getPlayerScoreFromFrbeResult('1/2-1/2', true)).toBe(0.5);
      expect(getPlayerScoreFromFrbeResult('0.5-0.5', true)).toBe(0.5);
    });

    it('handles special partial forfeit scores correctly', () => {
      expect(getPlayerScoreFromFrbeResult('½-0', true)).toBe(0.5);
      expect(getPlayerScoreFromFrbeResult('0-½', true)).toBe(0);
    });

    it('returns 0 for double forfeit 0-0 or empty results', () => {
      expect(getPlayerScoreFromFrbeResult('0-0', true)).toBe(0);
      expect(getPlayerScoreFromFrbeResult('0-0 FF', true)).toBe(0);
      expect(getPlayerScoreFromFrbeResult('', true)).toBe(0);
    });
  });

  describe('Away player perspective (Visitor - score inverted)', () => {
    it('returns 0 when raw result is 1-0 (Home won)', () => {
      expect(getPlayerScoreFromFrbeResult('1-0', false)).toBe(0);
      expect(getPlayerScoreFromFrbeResult('1-0 FF', false)).toBe(0);
    });

    it('returns 1 when raw result is 0-1 (Visitor won)', () => {
      expect(getPlayerScoreFromFrbeResult('0-1', false)).toBe(1);
      expect(getPlayerScoreFromFrbeResult('0-1 FF', false)).toBe(1);
    });

    it('returns 0.5 on a draw for away player', () => {
      expect(getPlayerScoreFromFrbeResult('½-½', false)).toBe(0.5);
      expect(getPlayerScoreFromFrbeResult('1/2-1/2', false)).toBe(0.5);
    });

    it('handles special partial forfeit scores for away player', () => {
      expect(getPlayerScoreFromFrbeResult('½-0', false)).toBe(0);
      expect(getPlayerScoreFromFrbeResult('0-½', false)).toBe(0.5);
    });
  });
});

describe('Performance Domain - formatBoardResult', () => {
  it('keeps normal orientation for home player', () => {
    expect(formatBoardResult('1-0', true)).toBe('1-0');
    expect(formatBoardResult('0-1', true)).toBe('0-1');
    expect(formatBoardResult('½-½', true)).toBe('½-½');
    expect(formatBoardResult('1-0 FF', true)).toBe('1-0 FF');
  });

  it('flips the score perspective when our player is Away (Visitor)', () => {
    // If raw is 1-0 (Home won), our away player lost: displays 0-1
    expect(formatBoardResult('1-0', false)).toBe('0-1');
    // If raw is 0-1 (Away won), our away player won: displays 1-0
    expect(formatBoardResult('0-1', false)).toBe('1-0');
    // Forfeits preserve FF tag but flip winner
    expect(formatBoardResult('1-0 FF', false)).toBe('0-1 FF');
    expect(formatBoardResult('0-1 FF', false)).toBe('1-0 FF');
    // Draws remain symmetrical
    expect(formatBoardResult('½-½', false)).toBe('½-½');
  });

  it('handles empty or unrecognized strings gracefully', () => {
    expect(formatBoardResult('', true)).toBe('');
    expect(formatBoardResult('', false)).toBe('');
  });
});
