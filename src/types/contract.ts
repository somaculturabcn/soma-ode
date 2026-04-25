export type ContractType =
  | 'image'
  | 'media'
  | 'booking'
  | 'event'
  | 'distribution'
  | 'invitation'

export interface RevenueSplit {
  platform?: number
  soma?: number
  artist?: number
}

export interface Contract {
  id: string
  artistId: string
  type: ContractType

  title: string
  startDate?: string
  endDate?: string

  revenue?: RevenueSplit
  notes?: string

  status: 'draft' | 'active' | 'closed'
}