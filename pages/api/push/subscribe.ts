import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()
  const { subscription, caregiver_email } = req.body
  if (!subscription || !caregiver_email) return res.status(400).json({ error: 'missing fields' })

  const { data: cg } = await supabase.from('caregivers').select('id').eq('email', caregiver_email).single()
  if (!cg) return res.status(404).json({ error: 'caregiver not found' })

  await supabase.from('push_subscriptions').upsert({
    caregiver_id: cg.id,
    endpoint: subscription.endpoint,
    subscription: subscription,
  }, { onConflict: 'endpoint' })

  return res.status(200).json({ ok: true })
}
