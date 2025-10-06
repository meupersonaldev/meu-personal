type Handler = (payload: any) => void

const subscribers = new Map<string, Set<Handler>>()

export function publish(topic: string, payload: any) {
  const set = subscribers.get(topic)
  if (!set) return
  for (const handler of set) {
    try { handler(payload) } catch {}
  }
}

export function subscribe(topic: string, handler: Handler) {
  if (!subscribers.has(topic)) subscribers.set(topic, new Set())
  subscribers.get(topic)!.add(handler)
  return () => {
    try { subscribers.get(topic)?.delete(handler) } catch {}
  }
}

export function topicForAcademy(academyId: string) {
  return `academy:${academyId}`
}

export function topicForUser(userId: string) {
  return `user:${userId}`
}

export function topicForFranqueadora(franqueadoraId: string) {
  return `franqueadora:${franqueadoraId}`
}
