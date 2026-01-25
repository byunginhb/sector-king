import { describe, it, expect } from 'vitest'
import {
  formatMarketCap,
  formatPrice,
  formatPriceChange,
  formatVolume,
  formatNumber,
  formatDate,
} from '@/lib/format'

describe('formatMarketCap', () => {
  it('returns N/A for null', () => {
    expect(formatMarketCap(null)).toBe('N/A')
  })

  it('returns N/A for 0', () => {
    expect(formatMarketCap(0)).toBe('N/A')
  })

  it('formats trillions correctly', () => {
    expect(formatMarketCap(1.5e12)).toBe('$1.50T')
    expect(formatMarketCap(2.34e12)).toBe('$2.34T')
  })

  it('formats billions correctly', () => {
    expect(formatMarketCap(500e9)).toBe('$500.00B')
    expect(formatMarketCap(1.23e9)).toBe('$1.23B')
  })

  it('formats millions correctly', () => {
    expect(formatMarketCap(50e6)).toBe('$50.00M')
    expect(formatMarketCap(1.5e6)).toBe('$1.50M')
  })

  it('formats smaller values with locale string', () => {
    expect(formatMarketCap(999999)).toBe('$999,999')
  })
})

describe('formatPrice', () => {
  it('returns N/A for null', () => {
    expect(formatPrice(null)).toBe('N/A')
  })

  it('formats price with two decimals', () => {
    expect(formatPrice(123.456)).toBe('$123.46')
    expect(formatPrice(100)).toBe('$100.00')
    expect(formatPrice(0.99)).toBe('$0.99')
  })
})

describe('formatPriceChange', () => {
  it('returns N/A for null', () => {
    expect(formatPriceChange(null)).toBe('N/A')
  })

  it('formats positive change with plus sign', () => {
    expect(formatPriceChange(5.5)).toBe('+5.50%')
    expect(formatPriceChange(0)).toBe('+0.00%')
  })

  it('formats negative change without plus sign', () => {
    expect(formatPriceChange(-3.21)).toBe('-3.21%')
  })
})

describe('formatVolume', () => {
  it('returns N/A for null or 0', () => {
    expect(formatVolume(null)).toBe('N/A')
    expect(formatVolume(0)).toBe('N/A')
  })

  it('formats billions correctly', () => {
    expect(formatVolume(1.5e9)).toBe('1.50B')
  })

  it('formats millions correctly', () => {
    expect(formatVolume(50e6)).toBe('50.00M')
  })

  it('formats thousands correctly', () => {
    expect(formatVolume(500e3)).toBe('500.00K')
  })

  it('formats smaller values with locale string', () => {
    expect(formatVolume(999)).toBe('999')
  })
})

describe('formatNumber', () => {
  it('returns N/A for null', () => {
    expect(formatNumber(null)).toBe('N/A')
  })

  it('formats number with locale string', () => {
    expect(formatNumber(1234567)).toBe('1,234,567')
    expect(formatNumber(100)).toBe('100')
  })
})

describe('formatDate', () => {
  it('formats date in Korean locale', () => {
    const result = formatDate('2024-01-15')
    expect(result).toMatch(/2024/)
    expect(result).toMatch(/01/)
    expect(result).toMatch(/15/)
  })
})
