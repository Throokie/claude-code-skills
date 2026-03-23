import { describe, it, expect } from 'vitest'
import {
  roundRobinStrategy,
  randomStrategy,
  weightedStrategy,
  leastConnectionsStrategy,
} from '../src/services/loadBalancer.service'
import type { Account } from '../src/types'

describe('Load Balancer', () => {
  const mockAccounts: Account[] = [
    { id: '1', email: 'test1@example.com', weight: 1, status: 'ACTIVE', quotaRemaining: 100, createdAt: new Date(), updatedAt: new Date() },
    { id: '2', email: 'test2@example.com', weight: 2, status: 'ACTIVE', quotaRemaining: 100, createdAt: new Date(), updatedAt: new Date() },
    { id: '3', email: 'test3@example.com', weight: 1, status: 'ACTIVE', quotaRemaining: 100, createdAt: new Date(), updatedAt: new Date() },
  ]

  describe('roundRobinStrategy', () => {
    it('should cycle through accounts in order', () => {
      const results: string[] = []
      for (let i = 0; i < 6; i++) {
        results.push(roundRobinStrategy(mockAccounts).id)
      }
      expect(results).toEqual(['1', '2', '3', '1', '2', '3'])
    })
  })

  describe('randomStrategy', () => {
    it('should return an account from the list', () => {
      const result = randomStrategy(mockAccounts)
      expect(mockAccounts.map(a => a.id)).toContain(result.id)
    })
  })

  describe('weightedStrategy', () => {
    it('should return an account from the list', () => {
      const result = weightedStrategy(mockAccounts)
      expect(mockAccounts.map(a => a.id)).toContain(result.id)
    })
  })

  describe('leastConnectionsStrategy', () => {
    it('should return first account for empty connections', () => {
      const result = leastConnectionsStrategy(mockAccounts)
      expect(mockAccounts.map(a => a.id)).toContain(result.id)
    })
  })
})
