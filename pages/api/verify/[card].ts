import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const raw = (req.query.card as string || '').toUpperCase().replace(/^KH-?/, '')
  const num = parseInt(raw, 10)
  if (!num || isNaN(num)) return res.status(400).json({ error: 'Ungültige Kartennummer' })

  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const { data: cg } = await db.from('caregivers').select('name,card_number,card_type,birthdate').eq('card_number', num).single()
  if (cg) {
    return res.json({ found: true, name: cg.name, card_number: cg.card_number, birthdate: cg.birthdate, type: cg.card_type === 'geschaeftsfuehrung' ? 'Geschäftsführung' : 'Betreuungsteam', role: 'caregiver' })
  }

  const { data: cl } = await db.from('clients').select('name,card_number,birthdate').eq('card_number', num).single()
  if (cl) {
    return res.json({ found: true, name: cl.name, card_number: cl.card_number, birthdate: cl.birthdate, type: 'Klient', role: 'client' })
  }

  return res.json({ found: false })
}
