import { describe, it, expect, beforeEach } from 'vitest'
import {
  generateApiKey,
  isValidApiKeyFormat,
  hashApiKey,
  verifyApiKey,
  hashPassword,
  verifyPassword,
} from '../src/utils/crypto'

describe('Crypto Utils', () => {
  describe('generateApiKey', () => {
    it('should generate API key with correct format', () => {
      const key = generateApiKey()
      expect(key).toMatch(/^cfap_[A-Z0-9]{26}$/)
    })

    it('should generate unique keys', () => {
      const key1 = generateApiKey()
      const key2 = generateApiKey()
      expect(key1).not.toBe(key2)
    })
  })

  describe('isValidApiKeyFormat', () => {
    it('should return true for valid API key', () => {
      const key = generateApiKey()
      expect(isValidApiKeyFormat(key)).toBe(true)
    })

    it('should return false for invalid API key', () => {
      expect(isValidApiKeyFormat('invalid')).toBe(false)
      expect(isValidApiKeyFormat('cfap_')).toBe(false)
    })
  })

  describe('hashApiKey and verifyApiKey', () => {
    it('should hash and verify API key', async () => {
      const key = generateApiKey()
      const hashed = await hashApiKey(key)
      expect(await verifyApiKey(key, hashed)).toBe(true)
    })

    it('should fail verification for wrong key', async () => {
      const key1 = generateApiKey()
      const key2 = generateApiKey()
      const hashed = await hashApiKey(key1)
      expect(await verifyApiKey(key2, hashed)).toBe(false)
    })
  })

  describe('hashPassword and verifyPassword', () => {
    it('should hash and verify password', async () => {
      const password = 'testPassword123'
      const hashed = await hashPassword(password)
      expect(await verifyPassword(password, hashed)).toBe(true)
    })

    it('should fail verification for wrong password', async () => {
      const password = 'testPassword123'
      const wrongPassword = 'wrongPassword'
      const hashed = await hashPassword(password)
      expect(await verifyPassword(wrongPassword, hashed)).toBe(false)
    })
  })
})
