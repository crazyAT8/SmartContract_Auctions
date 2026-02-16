import {
  formatAddress,
  formatEther,
  formatTimeRemaining,
  formatAuctionType,
  getAuctionTypeColor,
  getAuctionStatusColor,
} from '@/utils/formatting';

describe('formatting utils', () => {
  describe('formatAddress', () => {
    it('shortens address to 6...4', () => {
      expect(formatAddress('0x1234567890123456789012345678901234567890')).toBe('0x1234...7890');
    });
    it('returns empty string for empty input', () => {
      expect(formatAddress('')).toBe('');
    });
  });

  describe('formatEther', () => {
    it('formats wei string to ETH', () => {
      expect(formatEther('1000000000000000000')).toBe('1.0000');
    });
    it('accepts bigint', () => {
      expect(formatEther(BigInt('1000000000000000000'))).toBe('1.0000');
    });
  });

  describe('formatTimeRemaining', () => {
    it('returns "Ended" for zero or negative', () => {
      expect(formatTimeRemaining(0)).toBe('Ended');
      expect(formatTimeRemaining(-1)).toBe('Ended');
    });
    it('formats seconds only', () => {
      expect(formatTimeRemaining(45)).toBe('45s');
    });
    it('formats minutes and seconds', () => {
      expect(formatTimeRemaining(125)).toBe('2m 5s');
    });
    it('formats hours', () => {
      expect(formatTimeRemaining(3665)).toBe('1h 1m 5s');
    });
    it('formats days', () => {
      expect(formatTimeRemaining(90061)).toBe('1d 1h 1m');
    });
  });

  describe('formatAuctionType', () => {
    it('formats known types', () => {
      expect(formatAuctionType('DUTCH')).toBe('Dutch Auction');
      expect(formatAuctionType('ENGLISH')).toBe('English Auction');
      expect(formatAuctionType('SEALED_BID')).toBe('Sealed Bid Auction');
    });
    it('returns raw string for unknown type', () => {
      expect(formatAuctionType('UNKNOWN')).toBe('UNKNOWN');
    });
  });

  describe('getAuctionTypeColor', () => {
    it('returns Tailwind classes for known types', () => {
      expect(getAuctionTypeColor('DUTCH')).toContain('orange');
      expect(getAuctionTypeColor('ENGLISH')).toContain('blue');
    });
  });

  describe('getAuctionStatusColor', () => {
    it('returns Tailwind classes for status', () => {
      expect(getAuctionStatusColor('ACTIVE')).toContain('green');
      expect(getAuctionStatusColor('ENDED')).toContain('red');
    });
  });
});
