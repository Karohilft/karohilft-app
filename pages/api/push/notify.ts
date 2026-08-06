import type { NextApiRequest, NextApiResponse } from 'next'
import webpush from 'web-push'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

webpush.setVapidDetails(
  'mailto:info@karohilft.at',
  process.env.VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
)

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()
  const { caregiver_id, title, body, url } = req.body
  if (!caregiver_id || !title) return res.status(400).json({ error: 'missing fields' })

  const { data: subs } = await supabase
    .from('push_subscriptions')
    .select('subscription')
    .eq('caregiver_id', caregiver_id)

  if (!subs || subs.length === 0) return res.status(200).json({ sent: 0 })

  const payload = JSON.stringify({ title, body, url })
  let sent = 0

  for (const row of subs) {
    try {
      await webpush.sendNotification(row.subscription, payload)
      sent++
    } catch (e: any) {
      if (e.statusCode === 410) {
        await supabase.from('push_subscriptions').delete().eq('endpoint', row.subscription.endpoint)
      }
    }
  }

  return res.status(200).json({ sent })
}
