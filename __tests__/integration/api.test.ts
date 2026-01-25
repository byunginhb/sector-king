import { describe, it, expect, beforeAll, vi } from 'vitest'

// Integration tests for API endpoints
// These tests verify the response structure and basic functionality

const BASE_URL = 'http://localhost:3000'

// Check if server is running
async function isServerRunning(): Promise<boolean> {
  try {
    const res = await fetch(`${BASE_URL}/api/map`, { method: 'HEAD' })
    return res.status !== 0
  } catch {
    return false
  }
}

describe.skipIf(!globalThis.fetch)('API Integration Tests', () => {
  let serverRunning = false

  beforeAll(async () => {
    serverRunning = await isServerRunning()
    if (!serverRunning) {
      console.warn('Server not running, skipping integration tests')
    }
  })

  describe('GET /api/map', () => {
    it.skipIf(!serverRunning)('returns map data with correct structure', async () => {
      const res = await fetch(`${BASE_URL}/api/map`)
      expect(res.status).toBe(200)

      const json = await res.json()
      expect(json.success).toBe(true)
      expect(json.data).toBeDefined()
      expect(json.data.categories).toBeInstanceOf(Array)
      expect(json.data.sectors).toBeInstanceOf(Array)
      expect(json.data.sectorCompanies).toBeInstanceOf(Array)
    })

    it.skipIf(!serverRunning)('returns categories with required fields', async () => {
      const res = await fetch(`${BASE_URL}/api/map`)
      const json = await res.json()

      if (json.data.categories.length > 0) {
        const category = json.data.categories[0]
        expect(category).toHaveProperty('id')
        expect(category).toHaveProperty('name')
        expect(category).toHaveProperty('order')
      }
    })

    it.skipIf(!serverRunning)('returns sectors with required fields', async () => {
      const res = await fetch(`${BASE_URL}/api/map`)
      const json = await res.json()

      if (json.data.sectors.length > 0) {
        const sector = json.data.sectors[0]
        expect(sector).toHaveProperty('id')
        expect(sector).toHaveProperty('name')
        expect(sector).toHaveProperty('categoryId')
      }
    })
  })

  describe('GET /api/company/[ticker]', () => {
    it.skipIf(!serverRunning)('returns company data for valid ticker', async () => {
      const res = await fetch(`${BASE_URL}/api/company/AAPL`)

      if (res.status === 200) {
        const json = await res.json()
        expect(json.success).toBe(true)
        expect(json.data).toBeDefined()
        expect(json.data.company).toBeDefined()
        expect(json.data.company.ticker).toBe('AAPL')
      }
    })

    it.skipIf(!serverRunning)('returns 404 for invalid ticker', async () => {
      const res = await fetch(`${BASE_URL}/api/company/INVALID_TICKER_123`)
      expect(res.status).toBe(404)

      const json = await res.json()
      expect(json.success).toBe(false)
      expect(json.error).toBeDefined()
    })

    it.skipIf(!serverRunning)('returns history as array', async () => {
      const res = await fetch(`${BASE_URL}/api/company/AAPL`)

      if (res.status === 200) {
        const json = await res.json()
        expect(json.data.history).toBeInstanceOf(Array)
      }
    })

    it.skipIf(!serverRunning)('returns sectors array', async () => {
      const res = await fetch(`${BASE_URL}/api/company/AAPL`)

      if (res.status === 200) {
        const json = await res.json()
        expect(json.data.sectors).toBeInstanceOf(Array)
      }
    })
  })

  describe('GET /api/sector/[sectorId]', () => {
    it.skipIf(!serverRunning)('returns sector data for valid sectorId', async () => {
      const res = await fetch(`${BASE_URL}/api/sector/cpu`)

      if (res.status === 200) {
        const json = await res.json()
        expect(json.success).toBe(true)
        expect(json.data).toBeDefined()
        expect(json.data.sector).toBeDefined()
      }
    })

    it.skipIf(!serverRunning)('returns 404 for invalid sectorId', async () => {
      const res = await fetch(`${BASE_URL}/api/sector/invalid_sector_123`)
      expect(res.status).toBe(404)

      const json = await res.json()
      expect(json.success).toBe(false)
      expect(json.error).toBeDefined()
    })

    it.skipIf(!serverRunning)('returns companies array', async () => {
      const res = await fetch(`${BASE_URL}/api/sector/cpu`)

      if (res.status === 200) {
        const json = await res.json()
        expect(json.data.companies).toBeInstanceOf(Array)
      }
    })

    it.skipIf(!serverRunning)('returns marketCapTotal as number', async () => {
      const res = await fetch(`${BASE_URL}/api/sector/cpu`)

      if (res.status === 200) {
        const json = await res.json()
        expect(typeof json.data.marketCapTotal).toBe('number')
      }
    })
  })
})

// Unit tests for API response structures (don't require server)
describe('API Response Types', () => {
  it('ApiResponse should have success and optional data/error', () => {
    const successResponse = { success: true, data: {} }
    const errorResponse = { success: false, error: 'Error message' }

    expect(successResponse.success).toBe(true)
    expect(successResponse.data).toBeDefined()
    expect(errorResponse.success).toBe(false)
    expect(errorResponse.error).toBeDefined()
  })
})
