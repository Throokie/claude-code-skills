/**
 * 加密工具模块
 * PRD: prd-20260324-143000-a7b3-v2
 * Layer: utils
 *
 * 提供API Key生成、密码哈希、数据加密等功能
 */

import bcrypt from 'bcryptjs';
import { ulid } from 'ulid';

// API Key前缀
const API_KEY_PREFIX = 'cfap_';

/**
 * 生成新的API Key
 * 格式: cfap_<ulid>
 */
export function generateApiKey(): string {
  return `${API_KEY_PREFIX}${ulid()}`;
}

/**
 * 验证API Key格式
 */
export function isValidApiKeyFormat(apiKey: string): boolean {
  return apiKey.startsWith(API_KEY_PREFIX) && apiKey.length === API_KEY_PREFIX.length + 26;
}

/**
 * 提取API Key的纯ID部分（用于存储）
 */
export function extractApiKeyId(apiKey: string): string {
  if (!apiKey.startsWith(API_KEY_PREFIX)) {
    throw new Error('Invalid API key format');
  }
  return apiKey.slice(API_KEY_PREFIX.length);
}

/**
 * 哈希API Key（用于数据库存储）
 */
export async function hashApiKey(apiKey: string): Promise<string> {
  // 使用bcrypt哈希，成本因子10
  return bcrypt.hash(apiKey, 10);
}

/**
 * 验证API Key
 */
export async function verifyApiKey(apiKey: string, hashedKey: string): Promise<boolean> {
  return bcrypt.compare(apiKey, hashedKey);
}

/**
 * 哈希密码
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

/**
 * 验证密码
 */
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

/**
 * 生成随机字符串
 */
export function generateRandomString(length: number = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * 简单的XOR加密（用于非敏感数据的轻量级加密）
 * 注意：不适用于密码等敏感数据
 */
export function xorEncrypt(text: string, key: string): string {
  let result = '';
  for (let i = 0; i < text.length; i++) {
    result += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length));
  }
  return Buffer.from(result).toString('base64');
}

/**
 * XOR解密
 */
export function xorDecrypt(encrypted: string, key: string): string {
  const text = Buffer.from(encrypted, 'base64').toString('utf-8');
  let result = '';
  for (let i = 0; i < text.length; i++) {
    result += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length));
  }
  return result;
}

/**
 * 生成安全令牌
 */
export function generateSecureToken(length: number = 32): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
}
