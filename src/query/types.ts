import { QueryClient } from '@tanstack/query-core'
import { Getter } from 'jotai'

export type CreateQueryOptions<Options> = Options | ((get: Getter) => Options)
export type GetQueryClient = (get: Getter) => QueryClient
