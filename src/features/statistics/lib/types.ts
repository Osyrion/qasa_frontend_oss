export interface AgingBucket {
  amount: number
  count: number
}

/** Keyed by currency code, then by bucket name. */
export type AgingByCurrency = Record<string, Record<string, AgingBucket>>

export interface PartnerRanking {
  client_id: string
  name: string | null
  amount: number
  percent_share: number | null
}

/** Keyed by currency code. */
export type PartnerRankingsByCurrency = Record<string, PartnerRanking[]>

export const AGING_BUCKETS = ['not_yet_due', 'd1_30', 'd31_60', 'd61_90', 'd90_plus'] as const
