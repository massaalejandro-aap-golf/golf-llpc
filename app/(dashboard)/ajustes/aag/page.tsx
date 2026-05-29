import { readSyncStatus } from '@/lib/aag-sync'
import AagSyncClient from './AagSyncClient'

export default async function AagSyncPage() {
  const status = await readSyncStatus()
  return <AagSyncClient initial={status} />
}
