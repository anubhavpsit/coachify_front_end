export type LoginUser = {
  id: number
  name: string
  email: string
  role: string
  created_at: string
  updated_at: string
  tenant_id: number
}

export type LoginResponse = {
  user: LoginUser
  token: string
}

export type TenantResponse = {
  tenant: {
    id: number
    theme_color?: string
    [key: string]: unknown
  }
}

export type LoginPayload = {
  email: string
  password: string
  tenant_id: number
}
