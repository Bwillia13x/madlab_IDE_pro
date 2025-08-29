// Core application types
export interface User {
  id: string
  name: string
  email: string
  role: 'admin' | 'user' | 'viewer'
}

export interface FinancialData {
  symbol: string
  price: number
  change: number
  changePercent: number
  volume: number
  marketCap?: number
  lastUpdated: Date
}

export interface Widget {
  id: string
  type: string
  title: string
  position: {
    x: number
    y: number
    width: number
    height: number
  }
  config: Record<string, any>
}

export interface Workspace {
  id: string
  name: string
  widgets: Widget[]
  createdAt: Date
  updatedAt: Date
}

// API Response types
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  hasMore: boolean
}
