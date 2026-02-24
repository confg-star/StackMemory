import { DATA_PROVIDER } from '../data-config'
import { CardRepository } from './interfaces'
import { SupabaseCardRepository } from './supabase-repository'
import { LocalPgCardRepository } from './local-pg-repository'

let cardRepositoryInstance: CardRepository | null = null

export function getCardRepository(): CardRepository {
  if (!cardRepositoryInstance) {
    if (DATA_PROVIDER === 'local_pg') {
      cardRepositoryInstance = new LocalPgCardRepository()
    } else {
      cardRepositoryInstance = new SupabaseCardRepository()
    }
  }
  return cardRepositoryInstance
}

export function isLocalPgMode(): boolean {
  return DATA_PROVIDER === 'local_pg'
}
