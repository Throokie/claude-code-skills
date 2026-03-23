import { describe, it, expect } from 'vitest'
import { checkRateLimit, getRateLimitStatus, resetRateLimit } from '../src/utils/rateLimiter'
import type { RateLimiterConfig } from '../src/utils/rateLimiter'

describe('Rate Limiter', () => {
  const config: RateLimiterConfig = {
    requestsPerMinute: 5,
    requestsPerHour: 100,
    requestsPerDay: 1000,
  }

  beforeEach(() => {
    resetRateLimit('test-key')
  })

  describe('checkRateLimit', () => {
    it('should allow requests under limit', async () => {
      for (let i = 0; i < 5; i++) {
        await expect(checkRateLimit('test-key', config)).resolves.not.toThrow()
      }
    })

    it('should throw when limit exceeded', async () => {
      for (let i = 0; i < 5; i++) {
        await checkRateLimit('test-key', config)
      }
      await expect(checkRateLimit('test-key', config)).rejects.toThrow('Rate limit exceeded')
    })
  })

  describe('getRateLimitStatus', () => {
    it('should return current status', async () => {
      await checkRateLimit('test-key', config)
      const status = getRateLimitStatus('test-key', config)

      expect(status.minute.count).toBe(1)
      expect(status.minute.remaining).toBe(4)
    })
  })
})
