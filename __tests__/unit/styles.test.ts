import { describe, it, expect } from 'vitest'
import {
  RANK_STYLES,
  CATEGORY_STYLES,
  PRICE_CHANGE_STYLES,
  getPriceChangeStyle,
  getRankStyle,
  getCategoryStyle,
} from '@/lib/styles'

describe('RANK_STYLES', () => {
  it('has styles for ranks 1-3', () => {
    expect(RANK_STYLES[1]).toBeDefined()
    expect(RANK_STYLES[2]).toBeDefined()
    expect(RANK_STYLES[3]).toBeDefined()
  })

  it('has correct labels', () => {
    expect(RANK_STYLES[1].label).toBe('1위')
    expect(RANK_STYLES[2].label).toBe('2위')
    expect(RANK_STYLES[3].label).toBe('3위')
  })

  it('has badge and hover styles', () => {
    expect(RANK_STYLES[1].badge).toBeDefined()
    expect(RANK_STYLES[1].hover).toBeDefined()
    expect(RANK_STYLES[2].badge).toBeDefined()
    expect(RANK_STYLES[3].badge).toBeDefined()
  })
})

describe('CATEGORY_STYLES', () => {
  it('has styles for all categories', () => {
    expect(CATEGORY_STYLES.computing).toBeDefined()
    expect(CATEGORY_STYLES.internet).toBeDefined()
    expect(CATEGORY_STYLES.mobile).toBeDefined()
    expect(CATEGORY_STYLES.media).toBeDefined()
    expect(CATEGORY_STYLES.ai).toBeDefined()
    expect(CATEGORY_STYLES.future_tech).toBeDefined()
  })

  it('each category has card, header, and accent styles', () => {
    expect(CATEGORY_STYLES.computing.card).toBeDefined()
    expect(CATEGORY_STYLES.computing.header).toBeDefined()
    expect(CATEGORY_STYLES.computing.accent).toBeDefined()
  })
})

describe('getPriceChangeStyle', () => {
  it('returns positive style for positive values', () => {
    expect(getPriceChangeStyle(5)).toBe(PRICE_CHANGE_STYLES.positive)
    expect(getPriceChangeStyle(0.01)).toBe(PRICE_CHANGE_STYLES.positive)
  })

  it('returns negative style for negative values', () => {
    expect(getPriceChangeStyle(-5)).toBe(PRICE_CHANGE_STYLES.negative)
    expect(getPriceChangeStyle(-0.01)).toBe(PRICE_CHANGE_STYLES.negative)
  })

  it('returns neutral style for zero', () => {
    expect(getPriceChangeStyle(0)).toBe(PRICE_CHANGE_STYLES.neutral)
  })

  it('returns neutral style for null', () => {
    expect(getPriceChangeStyle(null)).toBe(PRICE_CHANGE_STYLES.neutral)
  })
})

describe('getRankStyle', () => {
  it('returns correct style for ranks 1-3', () => {
    expect(getRankStyle(1)).toBe(RANK_STYLES[1])
    expect(getRankStyle(2)).toBe(RANK_STYLES[2])
    expect(getRankStyle(3)).toBe(RANK_STYLES[3])
  })

  it('returns rank 3 style for invalid ranks', () => {
    expect(getRankStyle(4)).toBe(RANK_STYLES[3])
    expect(getRankStyle(0)).toBe(RANK_STYLES[3])
    expect(getRankStyle(100)).toBe(RANK_STYLES[3])
  })
})

describe('getCategoryStyle', () => {
  it('returns correct style for known categories', () => {
    expect(getCategoryStyle('computing')).toBe(CATEGORY_STYLES.computing)
    expect(getCategoryStyle('internet')).toBe(CATEGORY_STYLES.internet)
    expect(getCategoryStyle('mobile')).toBe(CATEGORY_STYLES.mobile)
  })

  it('returns default style object for unknown categories', () => {
    const defaultStyle = getCategoryStyle('unknown')
    expect(defaultStyle).toHaveProperty('card')
    expect(defaultStyle).toHaveProperty('header')
    expect(defaultStyle).toHaveProperty('accent')
  })
})
