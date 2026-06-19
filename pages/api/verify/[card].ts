import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const token = req.query.card as string || ''

  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token)

  if (isUuid) {
    const { data: cg } = await db.from('caregivers').select('name,card_number,birthdate').eq('verify_token', token).single()
    if (cg) {
      return res.json({ found: true, name: cg.name, card_number: cg.card_number, birthdate: cg.birthdate, role: 'caregiver' })
    }

    const { data: cl } = await db.from('clients').select('name,card_number,birthdate').eq('verify_token', token).single()
    if (cl) {
      return res.json({ found: true, name: cl.name, card_number: cl.card_number, birthdate: cl.birthdate, role: 'client' })
    }
  }

  // Fallback: alte KH-XXXX Links funktionieren weiterhin
  const raw = token.toUpperCase().replace(/^KH-?/, '')
  const num = parseInt(raw, 10)
  if (num && !isNaN(num)) {
    const { data: cg } = await db.from('caregivers').select('name,card_number,birthdate').eq('card_number', num).single()
    if (cg) {
      return res.json({ found: true, name: cg.name, card_number: cg.card_number, birthdate: cg.birthdate, role: 'caregiver' })
    }
    const { data: cl } = await db.from('clients').select('name,card_number,birthdate').eq('card_number', num).single()
    if (cl) {
      return res.json({ found: true, name: cl.name, card_number: cl.card_number, birthdate: cl.birthdate, role: 'client' })
    }
  }

  return res.json({ found: false })
}
