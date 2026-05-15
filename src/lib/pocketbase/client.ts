import PocketBase from 'pocketbase'

const envUrl = import.meta.env.VITE_POCKETBASE_URL || ''
let backendUrl = envUrl

if (!envUrl || envUrl.includes('internal.goskip.dev') || envUrl.includes('shrd00.internal')) {
  backendUrl = typeof window !== 'undefined' ? window.location.origin : envUrl
}

const pb = new PocketBase(backendUrl)
pb.autoCancellation(false)

export default pb
