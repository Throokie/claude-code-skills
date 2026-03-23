import apiClient from './client'

export interface Account {
  id: string
  email: string
  status: 'ACTIVE' | 'RATE_LIMITED' | 'SUSPENDED' | 'EXPIRED' | 'ERROR'
  quotaRemaining: number
  weight: number
  lastUsedAt: string | null
  createdAt: string
  healthCheck?: {
    lastCheckedAt: string
    successCount: number
    failCount: number
    averageResponse: number
  }
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  hasMore: boolean
}

export const accountsApi = {
  getAll: async (page = 1, limit = 20) => {
    const { data } = await apiClient.get<PaginatedResponse<Account>>(`/admin/accounts?page=${page}&limit=${limit}`)
    return data
  },

  getById: async (id: string) => {
    const { data } = await apiClient.get<Account>(`/admin/accounts/${id}`)
    return data
  },

  create: async (account: { email: string; password: string; quotaRemaining?: number; weight?: number }) => {
    const { data } = await apiClient.post<Account>('/admin/accounts', account)
    return data
  },

  update: async (id: string, account: Partial<Account>) => {
    const { data } = await apiClient.put<Account>(`/admin/accounts/${id}`, account)
    return data
  },

  delete: async (id: string) => {
    await apiClient.delete(`/admin/accounts/${id}`)
  },
}
