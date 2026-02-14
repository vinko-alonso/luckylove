require('dotenv').config()
const express = require('express')
const cors = require('cors')
const multer = require('multer')
const { createClient } = require('@supabase/supabase-js')
const crypto = require('crypto')
const path = require('path')
const { CHALLENGE_XP_REWARD, COUPLE_LEVEL_XP_THRESHOLD } = require('./constants')

const app = express()
app.use(cors())
app.use(express.json())

app.use((req, res, next) => {
  const authHeader = req.headers.authorization
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`, {
    hasAuthHeader: Boolean(authHeader),
    contentType: req.headers['content-type']
  })
  next()
})

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
)

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

const upload = multer({ storage: multer.memoryStorage() })

const IMAGE_BUCKET = 'lucky-love-images'

async function getSignedImageUrl(path) {
  if (!path) return null
  if (path.startsWith('http')) return path

  const { data, error } = await supabaseAdmin.storage
    .from(IMAGE_BUCKET)
    .createSignedUrl(path, 60 * 60)

  if (error) {
    console.warn('signed url failed', error.message)
    return null
  }

  return data?.signedUrl ?? null
}

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send'

function isExpoPushToken(token) {
  return typeof token === 'string' &&
    (token.startsWith('ExpoPushToken') || token.startsWith('ExponentPushToken'))
}

async function sendExpoPush({ token, title, body, data }) {
  if (!isExpoPushToken(token)) return

  try {
    const response = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        to: token,
        title,
        body,
        data
      })
    })

    if (!response.ok) {
      const payload = await response.text()
      console.warn('sendExpoPush failed', response.status, payload)
    }
  } catch (error) {
    console.warn('sendExpoPush error', error?.message || error)
  }
}

async function fetchPartnerProfile(coupleId, actorId) {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('user_id, expo_push_token')
    .eq('couple_id', coupleId)
    .neq('user_id', actorId)
    .maybeSingle()

  if (error) {
    console.warn('fetchPartnerProfile failed', error.message)
    return null
  }

  return data ?? null
}

async function notifyPartnerPush({ coupleId, actorId, title, body, data }) {
  const partner = await fetchPartnerProfile(coupleId, actorId)
  if (!partner?.expo_push_token) return
  await sendExpoPush({ token: partner.expo_push_token, title, body, data })
}

async function createHomeNotification({
  coupleId,
  actorId,
  action,
  entityType,
  entityId,
  message
}) {
  const seenBy = actorId ? [actorId] : []
  const { data, error } = await supabaseAdmin
    .from('home_notifications')
    .insert({
      couple_id: coupleId,
      actor_id: actorId,
      action,
      entity_type: entityType ?? null,
      entity_id: entityId ?? null,
      message: message ?? null,
      seen_by: seenBy
    })
    .select('*')
    .single()

  if (error) {
    console.warn('createHomeNotification failed', error.message)
    return null
  }

  return data
}

function sanitizeSegment(value) {
  return String(value || '')
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80) || 'item'
}

function normalizeDate(value) {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value
  }
  return new Date().toISOString().slice(0, 10)
}

function extractDateFromName(fileName) {
  const match = String(fileName).match(/\d{4}-\d{2}-\d{2}/)
  return match ? match[0] : null
}

async function listStorageFiles(prefix) {
  const files = []
  const queue = [prefix]

  while (queue.length > 0) {
    const current = queue.shift()
    const { data, error } = await supabaseAdmin.storage
      .from(IMAGE_BUCKET)
      .list(current, { limit: 200, sortBy: { column: 'name', order: 'desc' } })

    if (error) {
      throw error
    }

    for (const item of data ?? []) {
      const itemPath = current ? `${current}/${item.name}` : item.name
      if (item.id === null && item.name) {
        queue.push(itemPath)
      } else {
        files.push({ path: itemPath, name: item.name, updatedAt: item.updated_at })
      }
    }
  }

  return files
}

const spotifyTokens = new Map()
const dailyMessageCache = new Map()

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const DAILY_QUESTION_MOCKS = [
  'Que fue lo mejor de tu dia hoy?',
  'Cual fue el momento mas bonito que viviste con tu pareja esta semana?',
  'Que te gustaria hacer juntos este fin de semana?',
  'Que detalle pequeno te haria sentir mas querido hoy?',
  'Si pudieran viajar ahora, a donde irian y por que?'
]

function generateCode(length = 6) {
  let output = ''
  const bytes = crypto.randomBytes(length)

  for (let i = 0; i < length; i += 1) {
    output += CODE_CHARS[bytes[i] % CODE_CHARS.length]
  }

  return output
}

function getTodayRangeUtc() {
  const now = new Date()
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  const end = new Date(start)
  end.setUTCDate(start.getUTCDate() + 1)
  return { start, end }
}

function getTodayKeyUtc() {
  const { start } = getTodayRangeUtc()
  return start.toISOString().slice(0, 10)
}

async function addCoupleXp(coupleId, amount) {
  const { data: levelRow } = await supabaseAdmin
    .from('couple_levels')
    .select('*')
    .eq('couple_id', coupleId)
    .maybeSingle()

  const currentXp = Number(levelRow?.xp ?? 0)
  const currentLevel = Number(levelRow?.level ?? 1)
  const nextXp = currentXp + amount
  const shouldLevelUp = nextXp >= COUPLE_LEVEL_XP_THRESHOLD
  const updatedLevel = shouldLevelUp ? currentLevel + 1 : currentLevel
  const updatedXp = shouldLevelUp ? 0 : nextXp

  if (levelRow) {
    await supabaseAdmin
      .from('couple_levels')
      .update({
        xp: updatedXp,
        level: updatedLevel,
        updated_at: new Date().toISOString()
      })
      .eq('couple_id', coupleId)
  } else {
    await supabaseAdmin.from('couple_levels').insert({
      couple_id: coupleId,
      xp: updatedXp,
      level: updatedLevel
    })
  }
}

async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || ''
  const token = authHeader.startsWith('Bearer ')
    ? authHeader.slice(7)
    : null

  if (!token) {
    console.warn('requireAuth: missing token')
    return res.status(401).json({ error: 'Token requerido.' })
  }

  const { data, error } = await supabaseAdmin.auth.getUser(token)

  if (error || !data?.user) {
    console.warn('requireAuth: invalid token', error?.message)
    return res.status(401).json({ error: 'Token invalido.' })
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('user_id, email, couple_id')
    .eq('user_id', data.user.id)
    .single()

  if (profileError) {
    return res.status(401).json({ error: 'Perfil no encontrado.' })
  }

  req.user = {
    id: data.user.id,
    email: data.user.email,
    coupleId: profile.couple_id
  }

  return next()
}

function requireCouple(req, res, next) {
  if (!req.user?.coupleId) {
    return res.status(409).json({ error: 'Usuario sin pareja.' })
  }

  return next()
}

async function getSpotifyAccessToken(userId) {
  const entry = spotifyTokens.get(userId)
  if (!entry) return null

  const now = Date.now()
  if (entry.expiresAt && entry.expiresAt > now + 30_000) {
    return entry.accessToken
  }

  if (!entry.refreshToken) return null

  const clientId = process.env.SPOTIFY_CLIENT_ID
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET

  if (!clientId || !clientSecret) return null

  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: entry.refreshToken
  })

  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      Authorization:
        'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body
  })

  if (!response.ok) return null

  const data = await response.json()
  const expiresAt = Date.now() + (data.expires_in || 3600) * 1000

  spotifyTokens.set(userId, {
    accessToken: data.access_token,
    refreshToken: entry.refreshToken,
    expiresAt
  })

  return data.access_token
}

async function ensureDebugUser() {
  const debugEmail = process.env.DEBUG_BASE_EMAIL
  const debugPassword = process.env.DEBUG_BASE_PASSWORD
  const debugCode = process.env.DEBUG_CONNECT_CODE

  if (!debugEmail || !debugPassword || !debugCode) {
    return
  }

  const { data: listData, error: listError } =
    await supabaseAdmin.auth.admin.listUsers({ perPage: 200 })

  if (listError) {
    throw listError
  }

  const normalizedEmail = debugEmail.trim().toLowerCase()
  const existingUser = listData?.users?.find(
    (user) => user.email?.toLowerCase() === normalizedEmail
  )

  let userId = existingUser?.id ?? null

  if (!userId) {
    const { data: userData, error: userError } =
      await supabaseAdmin.auth.admin.createUser({
        email: normalizedEmail,
        password: debugPassword,
        email_confirm: true
      })

    if (userError) {
      throw userError
    }

    userId = userData.user.id
  }

  const { data: profileData, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle()

  if (profileError) {
    throw profileError
  }

  if (!profileData) {
    const { error: insertError } = await supabaseAdmin.from('profiles').insert({
      user_id: userId,
      email: normalizedEmail,
      alias: 'Base'
    })

    if (insertError) {
      throw insertError
    }
  }

  const { error: updateError } = await supabaseAdmin
    .from('profiles')
    .update({ connect_code: debugCode })
    .eq('user_id', userId)

  if (updateError) {
    throw updateError
  }
}

app.get('/', (req, res) => {
  res.json({ message: 'Servidor funcionando 🚀' })
})

app.post('/auth/register', async (req, res) => {
  const { email, password } = req.body

  if (!email || !password) {
    console.warn('register: missing email or password')
    return res.status(400).json({ error: 'Faltan datos obligatorios.' })
  }

  let createdUserId = null

  try {
    const { data: userData, error: userError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true
      })

    if (userError) {
      const status = userError.message?.toLowerCase().includes('registered')
        ? 409
        : 400
      return res.status(status).json({ error: userError.message })
    }

    createdUserId = userData.user.id

    const { error: profileError } = await supabaseAdmin.from('profiles').insert({
      user_id: createdUserId,
      email
    })

    if (profileError) throw profileError

    const { data: profileData, error: profileFetchError } = await supabaseAdmin
      .from('profiles')
      .select('user_id, alias, email, couple_id, photo_url, theme_light, theme_dark, birthday, favorite_food, personality_type, whatsapp_url, instagram_url, tiktok_url, linkedin_url, terms_accepted_at')
      .eq('user_id', createdUserId)
      .single()

    if (profileFetchError) throw profileFetchError

    const signedProfilePhoto = await getSignedImageUrl(profileData?.photo_url)

    const { data: sessionData, error: sessionError } =
      await supabase.auth.signInWithPassword({
        email,
        password
      })

    if (sessionError) throw sessionError

    return res.status(201).json({
      message: 'Usuario creado',
      session: sessionData.session,
      user: sessionData.user,
      profile: {
        ...profileData,
        photo_url: signedProfilePhoto,
        photo_path: profileData?.photo_url ?? null
      }
    })
  } catch (err) {
    console.error('register: failed', err.message)
    if (createdUserId) {
      await supabaseAdmin.auth.admin.deleteUser(createdUserId)
    }

    return res.status(500).json({ error: err.message })
  }
})

app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body

  if (!email || !password) {
    console.warn('login: missing email or password')
    return res.status(400).json({ error: 'Email y password son requeridos.' })
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  })

  if (error) {
    console.warn('login: auth error', error.message)
    return res.status(401).json({ error: error.message })
  }

  const userId = data.user?.id

  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('alias, email, couple_id, photo_url, theme_light, theme_dark, birthday, favorite_food, personality_type, whatsapp_url, instagram_url, tiktok_url, linkedin_url, terms_accepted_at')
    .eq('user_id', userId)
    .single()
  const signedProfilePhoto = await getSignedImageUrl(profile?.photo_url)

  if (profileError) {
    console.error('login: profile fetch error', profileError.message)
    return res.status(500).json({ error: profileError.message })
  }

  let couple = null
  if (profile?.couple_id) {
    const { data: coupleData, error: coupleError } = await supabaseAdmin
      .from('couples')
      .select('id, code, member_count, relationship_start_date, meet_date')
      .eq('id', profile.couple_id)
      .single()

    if (coupleError) {
      console.error('login: couple fetch error', coupleError.message)
      return res.status(500).json({ error: coupleError.message })
    }

    couple = coupleData
  }

  return res.json({
    session: data.session,
    user: data.user,
    profile: profile
      ? {
        ...profile,
        photo_url: signedProfilePhoto,
        photo_path: profile?.photo_url ?? null
      }
      : null,
    couple
  })
})

app.get('/spotify/auth-url', requireAuth, (req, res) => {
  const clientId = process.env.SPOTIFY_CLIENT_ID
  const redirectUri = process.env.SPOTIFY_REDIRECT_URI
  const scopes = process.env.SPOTIFY_SCOPES || ''

  if (!clientId || !redirectUri) {
    return res.status(500).json({ error: 'Spotify no configurado.' })
  }

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: scopes,
    state: req.user.id
  })

  return res.json({
    url: `https://accounts.spotify.com/authorize?${params.toString()}`
  })
})

app.post('/spotify/exchange', requireAuth, async (req, res) => {
  const { code } = req.body
  const clientId = process.env.SPOTIFY_CLIENT_ID
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET
  const redirectUri = process.env.SPOTIFY_REDIRECT_URI

  if (!code || !clientId || !clientSecret || !redirectUri) {
    return res.status(400).json({ error: 'Datos Spotify incompletos.' })
  }

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri
  })

  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      Authorization:
        'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body
  })

  if (!response.ok) {
    const text = await response.text()
    return res.status(400).json({ error: text })
  }

  const data = await response.json()
  const expiresAt = Date.now() + (data.expires_in || 3600) * 1000

  spotifyTokens.set(req.user.id, {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt
  })

  return res.json({ success: true })
})

app.get('/spotify/search', requireAuth, async (req, res) => {
  const { q } = req.query

  if (!q) {
    return res.status(400).json({ error: 'Query requerida.' })
  }

  const token = await getSpotifyAccessToken(req.user.id)
  if (!token) {
    return res.status(401).json({ error: 'Spotify no conectado.' })
  }

  const params = new URLSearchParams({
    q: String(q),
    type: 'track',
    limit: '10'
  })

  const response = await fetch(`https://api.spotify.com/v1/search?${params}`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  })

  if (!response.ok) {
    const text = await response.text()
    return res.status(500).json({ error: text })
  }

  const data = await response.json()
  const items = (data.tracks?.items || []).map((track) => ({
    id: track.id,
    name: track.name,
    artist: track.artists?.map((artist) => artist.name).join(', '),
    image: track.album?.images?.[0]?.url ?? null,
    previewUrl: track.preview_url
  }))

  return res.json({ items })
})

app.post(
  '/calendar/day/:dayId/song',
  requireAuth,
  requireCouple,
  async (req, res) => {
    const { dayId } = req.params
    const { trackId, title, artist, previewUrl } = req.body

    if (!trackId && !title) {
      return res.status(400).json({ error: 'trackId requerido.' })
    }

    let songData = { title, artist, previewUrl }

    if (trackId && (!title || !artist)) {
      const token = await getSpotifyAccessToken(req.user.id)
      if (!token) {
        return res.status(401).json({ error: 'Spotify no conectado.' })
      }

      const response = await fetch(
        `https://api.spotify.com/v1/tracks/${trackId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      )

      if (response.ok) {
        const data = await response.json()
        songData = {
          title: data.name,
          artist: data.artists?.map((artistItem) => artistItem.name).join(', '),
          previewUrl: data.preview_url
        }
      }
    }

    const { data, error } = await supabaseAdmin
      .from('calendar_songs')
      .insert({
        day_id: dayId,
        spotify_track_id: trackId,
        title: songData.title,
        artist: songData.artist,
        preview_url: songData.previewUrl
      })
      .select('*')
      .single()

    if (error) {
      return res.status(500).json({ error: error.message })
    }

    return res.status(201).json({ song: data })
  }
)

app.get('/home/daily-question', requireAuth, requireCouple, async (req, res) => {
  const { start, end } = getTodayRangeUtc()

  const { data: existing, error: existingError } = await supabaseAdmin
    .from('home_daily_questions')
    .select('*')
    .eq('couple_id', req.user.coupleId)
    .gte('asked_at', start.toISOString())
    .lt('asked_at', end.toISOString())
    .order('asked_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (existingError) {
    return res.status(500).json({ error: existingError.message })
  }

  if (existing) {
    return res.json({ question: existing })
  }

  const question =
    DAILY_QUESTION_MOCKS[Math.floor(Math.random() * DAILY_QUESTION_MOCKS.length)]

  const { data, error } = await supabaseAdmin
    .from('home_daily_questions')
    .insert({
      couple_id: req.user.coupleId,
      question,
      source: 'mock',
      asked_by: null
    })
    .select('*')
    .single()

  if (error) {
    return res.status(500).json({ error: error.message })
  }

  return res.json({ question: data })
})

app.get('/home/daily-question/answers', requireAuth, requireCouple, async (req, res) => {
  const { start, end } = getTodayRangeUtc()

  const { data: question, error: questionError } = await supabaseAdmin
    .from('home_daily_questions')
    .select('*')
    .eq('couple_id', req.user.coupleId)
    .gte('asked_at', start.toISOString())
    .lt('asked_at', end.toISOString())
    .order('asked_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (questionError) {
    return res.status(500).json({ error: questionError.message })
  }

  if (!question) {
    return res.status(404).json({ error: 'No hay pregunta diaria para hoy.' })
  }

  const { data: answers, error: answersError } = await supabaseAdmin
    .from('home_daily_answers')
    .select('id, user_id, answer_text, created_at')
    .eq('question_id', question.id)
    .order('created_at', { ascending: true })

  if (answersError) {
    return res.status(500).json({ error: answersError.message })
  }

  return res.json({ question, answers })
})

app.post(
  '/home/questions',
  requireAuth,
  requireCouple,
  async (req, res) => {
    const { question, source } = req.body

    if (!question) {
      return res.status(400).json({ error: 'question requerida.' })
    }

    const { data, error } = await supabaseAdmin
      .from('home_daily_questions')
      .insert({
        couple_id: req.user.coupleId,
        question,
        source: source ?? 'user',
        asked_by: req.user.id
      })
      .select('*')
      .single()

    if (error) {
      return res.status(500).json({ error: error.message })
    }

    return res.status(201).json({ question: data })
  }
)

app.get(
  '/home/questions',
  requireAuth,
  requireCouple,
  async (req, res) => {
    const { data, error } = await supabaseAdmin
      .from('home_daily_questions')
      .select('*')
      .eq('couple_id', req.user.coupleId)
      .order('asked_at', { ascending: false })
      .limit(30)

    if (error) {
      return res.status(500).json({ error: error.message })
    }

    return res.json({ items: data })
  }
)

app.post(
  '/home/questions/:id/answers',
  requireAuth,
  requireCouple,
  async (req, res) => {
    const { id } = req.params
    const { answerText } = req.body

    if (!answerText) {
      return res.status(400).json({ error: 'answerText requerida.' })
    }

    const { data, error } = await supabaseAdmin
      .from('home_daily_answers')
      .insert({
        question_id: id,
        user_id: req.user.id,
        answer_text: answerText
      })
      .select('*')
      .single()

    if (error) {
      return res.status(500).json({ error: error.message })
    }

    await createHomeNotification({
      coupleId: req.user.coupleId,
      actorId: req.user.id,
      action: 'answer_daily_question',
      entityType: 'daily_answer',
      entityId: data.id,
      message: 'Respondio la pregunta diaria.'
    })

    return res.status(201).json({ answer: data })
  }
)

app.post(
  '/home/daily-question/answer',
  requireAuth,
  requireCouple,
  async (req, res) => {
    const { answerText } = req.body

    if (!answerText) {
      return res.status(400).json({ error: 'answerText requerida.' })
    }

    const { start, end } = getTodayRangeUtc()
    const { data: question, error: questionError } = await supabaseAdmin
      .from('home_daily_questions')
      .select('*')
      .eq('couple_id', req.user.coupleId)
      .gte('asked_at', start.toISOString())
      .lt('asked_at', end.toISOString())
      .order('asked_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (questionError) {
      return res.status(500).json({ error: questionError.message })
    }

    if (!question) {
      return res.status(404).json({ error: 'No hay pregunta diaria para hoy.' })
    }

    const { data, error } = await supabaseAdmin
      .from('home_daily_answers')
      .insert({
        question_id: question.id,
        user_id: req.user.id,
        answer_text: answerText
      })
      .select('*')
      .single()

    if (error) {
      return res.status(500).json({ error: error.message })
    }

    await createHomeNotification({
      coupleId: req.user.coupleId,
      actorId: req.user.id,
      action: 'answer_daily_question',
      entityType: 'daily_answer',
      entityId: data.id,
      message: 'Respondio la pregunta diaria.'
    })

    return res.status(201).json({ answer: data, question })
  }
)

app.post('/home/messages', requireAuth, requireCouple, async (req, res) => {
  const { text } = req.body

  if (!text) {
    return res.status(400).json({ error: 'text requerido.' })
  }

  const { data, error } = await supabaseAdmin
    .from('home_messages')
    .insert({
      couple_id: req.user.coupleId,
      author_id: req.user.id,
      text
    })
    .select('*')
    .single()

  if (error) {
    return res.status(500).json({ error: error.message })
  }

  await createHomeNotification({
    coupleId: req.user.coupleId,
    actorId: req.user.id,
    action: 'create_message',
    entityType: 'message',
    entityId: data.id,
    message: 'Envio un mensaje.'
  })

  await notifyPartnerPush({
    coupleId: req.user.coupleId,
    actorId: req.user.id,
    title: 'Nuevo mensaje',
    body: 'Tu pareja envio un mensaje.',
    data: { type: 'message', id: data.id }
  })

  return res.status(201).json({ message: data })
})

app.get('/home/messages', requireAuth, requireCouple, async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('home_messages')
    .select('id, text, author_id, created_at')
    .eq('couple_id', req.user.coupleId)
    .order('created_at', { ascending: false })

  if (error) {
    return res.status(500).json({ error: error.message })
  }

  return res.json({ items: data })
})

app.get('/home/notifications', requireAuth, requireCouple, async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('home_notifications')
    .select('*')
    .eq('couple_id', req.user.coupleId)
    .order('created_at', { ascending: false })
    .limit(60)

  if (error) {
    return res.status(500).json({ error: error.message })
  }

  const rows = data ?? []
  const actorIds = Array.from(
    new Set(rows.map((item) => item.actor_id).filter(Boolean))
  )

  const { data: profiles } = await supabaseAdmin
    .from('profiles')
    .select('user_id, alias, email')
    .in('user_id', actorIds)

  const actorNameById = new Map()
  for (const profile of profiles ?? []) {
    const alias = profile.alias?.trim()
    const fallbackEmail = profile.email?.split('@')[0]
    actorNameById.set(profile.user_id, alias || fallbackEmail || 'Pareja')
  }

  const grouped = new Map()

  for (const item of rows) {
    const seenBy = Array.isArray(item.seen_by) ? item.seen_by : []
    const seen = item.actor_id === req.user.id || seenBy.includes(req.user.id)
    const actorId = item.actor_id ?? null
    const action = item.action ?? 'unknown'
    const key = `${actorId ?? 'none'}::${action}`

    if (!grouped.has(key)) {
      grouped.set(key, {
        ids: [],
        actor_id: actorId,
        action,
        count: 0,
        seen: true,
        created_at: item.created_at
      })
    }

    const entry = grouped.get(key)
    entry.ids.push(item.id)
    entry.count += 1
    entry.seen = entry.seen && seen

    if (item.created_at && entry.created_at) {
      if (new Date(item.created_at) > new Date(entry.created_at)) {
        entry.created_at = item.created_at
      }
    } else if (!entry.created_at) {
      entry.created_at = item.created_at
    }
  }

  const actionLabels = {
    create_review: {
      selfVerb: 'agregaste',
      otherVerb: 'agrego',
      singular: 'resena nueva',
      plural: 'resenas nuevas'
    },
    create_challenge: {
      selfVerb: 'creaste',
      otherVerb: 'creo',
      singular: 'reto nuevo',
      plural: 'retos nuevos'
    },
    create_message: {
      selfVerb: 'enviaste',
      otherVerb: 'envio',
      singular: 'mensaje nuevo',
      plural: 'mensajes nuevos'
    },
    create_reward: {
      selfVerb: 'creaste',
      otherVerb: 'creo',
      singular: 'beneficio nuevo',
      plural: 'beneficios nuevos'
    },
    edit_day: {
      selfVerb: 'editaste',
      otherVerb: 'edito',
      singular: 'dia del calendario',
      plural: 'dias del calendario'
    },
    answer_daily_question: {
      selfVerb: 'respondiste',
      otherVerb: 'respondio',
      singular: 'pregunta diaria',
      plural: 'preguntas diarias'
    }
  }

  const items = Array.from(grouped.values())
    .sort(
      (a, b) =>
        new Date(b.created_at ?? 0).getTime() -
        new Date(a.created_at ?? 0).getTime()
    )
    .map((entry) => {
      const isSelf = entry.actor_id === req.user.id
      const actorName = isSelf
        ? 'Tu'
        : actorNameById.get(entry.actor_id) || 'Pareja'

      const actionCopy = actionLabels[entry.action]
      const label = actionCopy
        ? entry.count === 1
          ? actionCopy.singular
          : actionCopy.plural
        : entry.count === 1
          ? 'novedad'
          : 'novedades'
      const verb = actionCopy
        ? isSelf
          ? actionCopy.selfVerb
          : actionCopy.otherVerb
        : isSelf
          ? 'hiciste'
          : 'hizo'
      const text = `${actorName} ${verb} ${entry.count} ${label}`

      return {
        ids: entry.ids,
        actor_id: entry.actor_id,
        actor_name: actorName,
        action: entry.action,
        count: entry.count,
        text,
        created_at: entry.created_at,
        seen: entry.seen
      }
    })

  return res.json({ items })
})

app.post('/home/notifications/seen', requireAuth, requireCouple, async (req, res) => {
  const { ids } = req.body

  let query = supabaseAdmin
    .from('home_notifications')
    .select('id, seen_by')
    .eq('couple_id', req.user.coupleId)

  if (Array.isArray(ids) && ids.length > 0) {
    query = query.in('id', ids)
  }

  const { data, error } = await query

  if (error) {
    return res.status(500).json({ error: error.message })
  }

  const updates = []
  for (const item of data ?? []) {
    const seenBy = Array.isArray(item.seen_by) ? item.seen_by : []
    if (!seenBy.includes(req.user.id)) {
      updates.push(
        supabaseAdmin
          .from('home_notifications')
          .update({ seen_by: [...seenBy, req.user.id] })
          .eq('id', item.id)
          .eq('couple_id', req.user.coupleId)
      )
    }
  }

  if (updates.length) {
    await Promise.all(updates)
  }

  return res.json({ updated: updates.length })
})

app.get('/home/daily-message', requireAuth, requireCouple, async (req, res) => {
  const todayKey = getTodayKeyUtc()
  const cacheKey = `${req.user.coupleId}:${todayKey}`

  if (dailyMessageCache.has(cacheKey)) {
    return res.json({ message: dailyMessageCache.get(cacheKey) })
  }

  const { data, error } = await supabaseAdmin
    .from('home_messages')
    .select('id, text, author_id, created_at')
    .eq('couple_id', req.user.coupleId)

  if (error) {
    return res.status(500).json({ error: error.message })
  }

  if (!data || data.length === 0) {
    return res.status(404).json({ error: 'No hay mensajes disponibles.' })
  }

  const randomMessage = data[Math.floor(Math.random() * data.length)]
  dailyMessageCache.set(cacheKey, randomMessage)

  return res.json({ message: randomMessage })
})

app.post(
  '/home/challenges',
  requireAuth,
  requireCouple,
  async (req, res) => {
    const { title, description, stars } = req.body

    if (!title) {
      return res.status(400).json({ error: 'title requerido.' })
    }

    const clampedStars = Math.min(Math.max(Number(stars) || 1, 1), 5)

    const { data, error } = await supabaseAdmin
      .from('home_challenges')
      .insert({
        couple_id: req.user.coupleId,
        created_by: req.user.id,
        title,
        description,
        stars: clampedStars,
        status: 'pending'
      })
      .select('*')
      .single()

    if (error) {
      return res.status(500).json({ error: error.message })
    }

    await createHomeNotification({
      coupleId: req.user.coupleId,
      actorId: req.user.id,
      action: 'create_challenge',
      entityType: 'challenge',
      entityId: data.id,
      message: `Creo un reto: ${title}.`
    })

    await notifyPartnerPush({
      coupleId: req.user.coupleId,
      actorId: req.user.id,
      title: 'Nuevo reto',
      body: title ? `Tu pareja creo el reto: ${title}.` : 'Tu pareja creo un reto.',
      data: { type: 'challenge', id: data.id }
    })

    return res.status(201).json({ challenge: data })
  }
)

app.get('/home/challenges', requireAuth, requireCouple, async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('home_challenges')
    .select('*')
    .eq('couple_id', req.user.coupleId)
    .order('created_at', { ascending: false })

  if (error) {
    return res.status(500).json({ error: error.message })
  }

  return res.json({ items: data })
})

app.get('/home/daily-challenges', requireAuth, requireCouple, async (req, res) => {
  const { date } = req.query
  const dayDate = normalizeDate(date)

  const { data, error } = await supabaseAdmin
    .from('home_daily_challenges')
    .select('*')
    .eq('couple_id', req.user.coupleId)
    .eq('day_date', dayDate)
    .order('created_at', { ascending: true })

  if (error) {
    return res.status(500).json({ error: error.message })
  }

  return res.json({ items: data ?? [] })
})

app.post('/home/daily-challenges', requireAuth, requireCouple, async (req, res) => {
  const { title, stars } = req.body

  if (!title) {
    return res.status(400).json({ error: 'title requerido.' })
  }

  const starsValue = Number(stars)
  if (!Number.isFinite(starsValue)) {
    return res.status(400).json({ error: 'stars requerido.' })
  }

  const clampedStars = Math.min(Math.max(Math.floor(starsValue), 1), 5)
  const todayKey = getTodayKeyUtc()

  const { data: existing, error: existingError } = await supabaseAdmin
    .from('home_daily_challenges')
    .select('id, stars')
    .eq('couple_id', req.user.coupleId)
    .eq('day_date', todayKey)

  if (existingError) {
    return res.status(500).json({ error: existingError.message })
  }

  const currentCount = existing?.length ?? 0
  if (currentCount >= 4) {
    return res.status(409).json({ error: 'Maximo 4 retos diarios.' })
  }

  const currentStars = (existing ?? []).reduce(
    (total, item) => total + Number(item.stars ?? 0),
    0
  )

  if (currentStars + clampedStars > 5) {
    return res.status(409).json({ error: 'Solo tienes 5 estrellas para repartir.' })
  }

  const { data, error } = await supabaseAdmin
    .from('home_daily_challenges')
    .insert({
      couple_id: req.user.coupleId,
      created_by: req.user.id,
      title,
      stars: clampedStars,
      day_date: todayKey
    })
    .select('*')
    .single()

  if (error) {
    return res.status(500).json({ error: error.message })
  }

  return res.status(201).json({ challenge: data })
})

app.post(
  '/home/daily-challenges/:id/complete',
  requireAuth,
  requireCouple,
  async (req, res) => {
    const { id } = req.params
    const todayKey = getTodayKeyUtc()

    const { data: existing, error: existingError } = await supabaseAdmin
      .from('home_daily_challenges')
      .select('*')
      .eq('id', id)
      .eq('couple_id', req.user.coupleId)
      .eq('day_date', todayKey)
      .single()

    if (existingError || !existing) {
      return res.status(404).json({ error: 'Reto diario no encontrado.' })
    }

    if (existing.completed_at) {
      return res.status(409).json({ error: 'Este reto ya fue cumplido.' })
    }

    const { data, error } = await supabaseAdmin
      .from('home_daily_challenges')
      .update({
        completed_by: req.user.id,
        completed_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('couple_id', req.user.coupleId)
      .select('*')
      .single()

    if (error) {
      return res.status(500).json({ error: error.message })
    }

    await addCoupleXp(req.user.coupleId, 1)

    return res.json({ challenge: data })
  }
)

app.post(
  '/home/challenges/:id/accept',
  requireAuth,
  requireCouple,
  async (req, res) => {
    const { id } = req.params

    const { data: existing, error: existingError } = await supabaseAdmin
      .from('home_challenges')
      .select('*')
      .eq('id', id)
      .eq('couple_id', req.user.coupleId)
      .single()

    if (existingError || !existing) {
      return res.status(404).json({ error: 'Reto no encontrado.' })
    }

    if (existing.created_by === req.user.id) {
      return res.status(403).json({ error: 'No puedes aceptar tu propio reto.' })
    }

    if (existing.status !== 'pending') {
      return res.status(409).json({ error: 'Este reto ya fue actualizado.' })
    }

    const { data, error } = await supabaseAdmin
      .from('home_challenges')
      .update({ status: 'accepted', accepted_by: req.user.id })
      .eq('id', id)
      .eq('couple_id', req.user.coupleId)
      .select('*')
      .single()

    if (error) {
      return res.status(500).json({ error: error.message })
    }

    return res.json({ challenge: data })
  }
)

app.post(
  '/home/challenges/:id/report',
  requireAuth,
  requireCouple,
  async (req, res) => {
    const { id } = req.params

    const { data: existing, error: existingError } = await supabaseAdmin
      .from('home_challenges')
      .select('*')
      .eq('id', id)
      .eq('couple_id', req.user.coupleId)
      .single()

    if (existingError || !existing) {
      return res.status(404).json({ error: 'Reto no encontrado.' })
    }

    if (existing.status !== 'accepted') {
      return res.status(409).json({ error: 'El reto no esta aceptado.' })
    }

    if (existing.accepted_by !== req.user.id) {
      return res.status(403).json({ error: 'Solo quien acepta puede reportar.' })
    }

    const { data, error } = await supabaseAdmin
      .from('home_challenges')
      .update({
        status: 'reported_accomplishment',
        reported_by: req.user.id,
        reported_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('couple_id', req.user.coupleId)
      .select('*')
      .single()

    if (error) {
      return res.status(500).json({ error: error.message })
    }

    return res.json({ challenge: data })
  }
)

app.post(
  '/home/challenges/:id/approve',
  requireAuth,
  requireCouple,
  async (req, res) => {
    const { id } = req.params

    const { data: existing, error: existingError } = await supabaseAdmin
      .from('home_challenges')
      .select('*')
      .eq('id', id)
      .eq('couple_id', req.user.coupleId)
      .single()

    if (existingError || !existing) {
      return res.status(404).json({ error: 'Reto no encontrado.' })
    }

    if (existing.created_by !== req.user.id) {
      return res.status(403).json({ error: 'Solo el creador puede aprobar.' })
    }

    if (existing.status !== 'reported_accomplishment') {
      return res.status(409).json({ error: 'El reto no esta reportado.' })
    }

    const { data, error } = await supabaseAdmin
      .from('home_challenges')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', id)
      .eq('couple_id', req.user.coupleId)
      .select('*')
      .single()

    if (error) {
      return res.status(500).json({ error: error.message })
    }

    await supabaseAdmin.from('couple_star_events').insert({
      couple_id: req.user.coupleId,
      challenge_id: id,
      awarded_to: existing.reported_by ?? existing.accepted_by,
      stars: existing.stars
    })

    const { data: levelRow } = await supabaseAdmin
      .from('couple_levels')
      .select('*')
      .eq('couple_id', req.user.coupleId)
      .maybeSingle()

    const currentXp = Number(levelRow?.xp ?? 0)
    const currentLevel = Number(levelRow?.level ?? 1)
    const nextXp = currentXp + CHALLENGE_XP_REWARD
    const shouldLevelUp = nextXp >= COUPLE_LEVEL_XP_THRESHOLD
    const updatedLevel = shouldLevelUp ? currentLevel + 1 : currentLevel
    const updatedXp = shouldLevelUp ? 0 : nextXp

    if (levelRow) {
      await supabaseAdmin
        .from('couple_levels')
        .update({
          xp: updatedXp,
          level: updatedLevel,
          updated_at: new Date().toISOString()
        })
        .eq('couple_id', req.user.coupleId)
    } else {
      await supabaseAdmin.from('couple_levels').insert({
        couple_id: req.user.coupleId,
        xp: updatedXp,
        level: updatedLevel
      })
    }

    return res.json({ challenge: data })
  }
)

app.post(
  '/home/challenges/:id/reject',
  requireAuth,
  requireCouple,
  async (req, res) => {
    const { id } = req.params

    const { data: existing, error: existingError } = await supabaseAdmin
      .from('home_challenges')
      .select('*')
      .eq('id', id)
      .eq('couple_id', req.user.coupleId)
      .single()

    if (existingError || !existing) {
      return res.status(404).json({ error: 'Reto no encontrado.' })
    }

    if (existing.created_by !== req.user.id) {
      return res.status(403).json({ error: 'Solo el creador puede rechazar.' })
    }

    if (existing.status !== 'reported_accomplishment') {
      return res.status(409).json({ error: 'El reto no esta reportado.' })
    }

    const { data, error } = await supabaseAdmin
      .from('home_challenges')
      .update({
        status: 'accepted',
        reported_by: null,
        reported_at: null
      })
      .eq('id', id)
      .eq('couple_id', req.user.coupleId)
      .select('*')
      .single()

    if (error) {
      return res.status(500).json({ error: error.message })
    }

    return res.json({ challenge: data })
  }
)

app.post(
  '/home/challenges/:id/complete',
  requireAuth,
  requireCouple,
  async (req, res) => {
    const { id } = req.params

    const { data: challenge, error: challengeError } = await supabaseAdmin
      .from('home_challenges')
      .select('*')
      .eq('id', id)
      .eq('couple_id', req.user.coupleId)
      .single()

    if (challengeError) {
      return res.status(500).json({ error: challengeError.message })
    }

    const { data, error } = await supabaseAdmin
      .from('home_challenges')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', id)
      .select('*')
      .single()

    if (error) {
      return res.status(500).json({ error: error.message })
    }

    await supabaseAdmin.from('couple_star_events').insert({
      couple_id: req.user.coupleId,
      challenge_id: id,
      awarded_to: req.user.id,
      stars: challenge.stars
    })

    return res.json({ challenge: data })
  }
)

app.get('/goals/level', requireAuth, requireCouple, async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('couple_levels')
    .select('*')
    .eq('couple_id', req.user.coupleId)
    .maybeSingle()

  if (error) {
    return res.status(500).json({ error: error.message })
  }

  const level = Number(data?.level ?? 1)
  const xp = Number(data?.xp ?? 0)

  return res.json({ level, xp, threshold: COUPLE_LEVEL_XP_THRESHOLD })
})

app.get('/goals/rewards', requireAuth, requireCouple, async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('couple_rewards')
    .select('*')
    .eq('couple_id', req.user.coupleId)
    .order('created_at', { ascending: false })

  if (error) {
    return res.status(500).json({ error: error.message })
  }

  const { data: starEvents, error: starError } = await supabaseAdmin
    .from('couple_star_events')
    .select('stars')
    .eq('couple_id', req.user.coupleId)
    .eq('awarded_to', req.user.id)

  if (starError) {
    return res.status(500).json({ error: starError.message })
  }

  const balance = (starEvents ?? []).reduce(
    (total, event) => total + Number(event.stars ?? 0),
    0
  )

  return res.json({ items: data, balance })
})

app.post('/goals/rewards', requireAuth, requireCouple, async (req, res) => {
  const { title, description, starsRequired } = req.body

  if (!title) {
    return res.status(400).json({ error: 'title requerido.' })
  }

  const starsValue = Number(starsRequired)
  if (!Number.isFinite(starsValue)) {
    return res.status(400).json({ error: 'starsRequired requerido.' })
  }

  const normalizedStars = Math.max(Math.floor(starsValue), 0)

  const { data, error } = await supabaseAdmin
    .from('couple_rewards')
    .insert({
      couple_id: req.user.coupleId,
      title,
      description: description ?? null,
      stars_required: normalizedStars,
      created_by: req.user.id,
      redeemed_at: null,
      redeemed_by: null
    })
    .select('*')
    .single()

  if (error) {
    return res.status(500).json({ error: error.message })
  }

  await createHomeNotification({
    coupleId: req.user.coupleId,
    actorId: req.user.id,
    action: 'create_reward',
    entityType: 'reward',
    entityId: data.id,
    message: `Creo un beneficio: ${title}.`
  })

  return res.status(201).json({ reward: data })
})

app.patch('/goals/rewards/:id', requireAuth, requireCouple, async (req, res) => {
  const { id } = req.params
  const { title, description, starsRequired } = req.body

  const { data: reward, error: rewardError } = await supabaseAdmin
    .from('couple_rewards')
    .select('*')
    .eq('id', id)
    .eq('couple_id', req.user.coupleId)
    .single()

  if (rewardError || !reward) {
    return res.status(404).json({ error: 'Beneficio no encontrado.' })
  }

  if (reward.created_by !== req.user.id) {
    return res.status(403).json({ error: 'No puedes editar este beneficio.' })
  }

  if (reward.redeemed_at) {
    return res.status(409).json({ error: 'No se puede editar un beneficio canjeado.' })
  }

  const updates = {}
  if (title !== undefined) updates.title = title
  if (description !== undefined) updates.description = description
  if (starsRequired !== undefined) {
    const starsValue = Number(starsRequired)
    if (!Number.isFinite(starsValue)) {
      return res.status(400).json({ error: 'starsRequired invalido.' })
    }
    updates.stars_required = Math.max(Math.floor(starsValue), 0)
  }

  const { data, error } = await supabaseAdmin
    .from('couple_rewards')
    .update(updates)
    .eq('id', id)
    .eq('couple_id', req.user.coupleId)
    .select('*')
    .single()

  if (error) {
    return res.status(500).json({ error: error.message })
  }

  return res.json({ reward: data })
})

app.post(
  '/goals/rewards/:id/redeem',
  requireAuth,
  requireCouple,
  async (req, res) => {
    const { id } = req.params

    const { data: reward, error: rewardError } = await supabaseAdmin
      .from('couple_rewards')
      .select('*')
      .eq('id', id)
      .eq('couple_id', req.user.coupleId)
      .single()

    if (rewardError || !reward) {
      return res.status(404).json({ error: 'Beneficio no encontrado.' })
    }

    if (reward.created_by === req.user.id) {
      return res.status(403).json({ error: 'No puedes canjear tu propio beneficio.' })
    }

    if (reward.redeemed_at) {
      return res.status(409).json({ error: 'Este beneficio ya fue canjeado.' })
    }

    const { data: starEvents, error: starError } = await supabaseAdmin
      .from('couple_star_events')
      .select('stars')
      .eq('couple_id', req.user.coupleId)
      .eq('awarded_to', req.user.id)

    if (starError) {
      return res.status(500).json({ error: starError.message })
    }

    const balance = (starEvents ?? []).reduce(
      (total, event) => total + Number(event.stars ?? 0),
      0
    )

    if (balance < Number(reward.stars_required ?? 0)) {
      return res.status(409).json({ error: 'No tienes suficientes estrellas.' })
    }

    const { data: eventData, error: eventError } = await supabaseAdmin
      .from('couple_star_events')
      .insert({
        couple_id: req.user.coupleId,
        reward_id: id,
        awarded_to: req.user.id,
        stars: -Math.abs(Number(reward.stars_required ?? 0))
      })
      .select('id')
      .single()

    if (eventError) {
      return res.status(500).json({ error: eventError.message })
    }

    const { data, error } = await supabaseAdmin
      .from('couple_rewards')
      .update({
        redeemed_at: new Date().toISOString(),
        redeemed_by: req.user.id
      })
      .eq('id', id)
      .eq('couple_id', req.user.coupleId)
      .select('*')
      .single()

    if (error) {
      await supabaseAdmin
        .from('couple_star_events')
        .delete()
        .eq('id', eventData.id)
      return res.status(500).json({ error: error.message })
    }

    return res.json({ reward: data })
  }
)

app.post(
  '/calendar/day',
  requireAuth,
  requireCouple,
  async (req, res) => {
    const { dayDate, ownerType, ownerUserId, noteText, printStyle, checkStyle } =
      req.body

    if (!dayDate) {
      return res.status(400).json({ error: 'dayDate requerido.' })
    }

    const { data, error } = await supabaseAdmin
      .from('calendar_days')
      .upsert(
        {
          couple_id: req.user.coupleId,
          day_date: dayDate,
          owner_type: ownerType ?? 'couple',
          owner_user_id: ownerUserId ?? null,
          note_text: noteText ?? null,
          print_style: printStyle ?? null,
          check_style: checkStyle ?? null,
          created_by: req.user.id
        },
        {
          onConflict: 'couple_id,day_date,owner_type,owner_user_id'
        }
      )
      .select('*')
      .single()

    if (error) {
      return res.status(500).json({ error: error.message })
    }

    await createHomeNotification({
      coupleId: req.user.coupleId,
      actorId: req.user.id,
      action: 'edit_day',
      entityType: 'calendar_day',
      entityId: data.id,
      message: `Actualizo el dia ${dayDate}.`
    })

    return res.status(201).json({ day: data })
  }
)

app.get(
  '/calendar/days',
  requireAuth,
  requireCouple,
  async (req, res) => {
    const { from, to } = req.query

    const query = supabaseAdmin
      .from('calendar_days')
      .select('*')
      .eq('couple_id', req.user.coupleId)

    if (from) {
      query.gte('day_date', from)
    }
    if (to) {
      query.lte('day_date', to)
    }

    const { data, error } = await query.order('day_date', {
      ascending: true
    })

    if (error) {
      return res.status(500).json({ error: error.message })
    }

    return res.json({ items: data })
  }
)

app.get('/calendar/days/overview', requireAuth, requireCouple, async (req, res) => {
  const { from, to } = req.query

  const query = supabaseAdmin
    .from('calendar_days')
    .select('id, day_date')
    .eq('couple_id', req.user.coupleId)
    .eq('owner_type', 'couple')
    .is('owner_user_id', null)

  if (from) {
    query.gte('day_date', from)
  }
  if (to) {
    query.lte('day_date', to)
  }

  const { data: days, error } = await query.order('day_date', { ascending: true })

  if (error) {
    return res.status(500).json({ error: error.message })
  }

  const dayIds = (days ?? []).map((day) => day.id)

  const { data: photos } = dayIds.length
    ? await supabaseAdmin
      .from('calendar_photos')
      .select('day_id, photo_url')
      .in('day_id', dayIds)
    : { data: [] }

  const { data: ratings } = dayIds.length
    ? await supabaseAdmin
      .from('calendar_day_ratings')
      .select('day_id, user_id, rating')
      .in('day_id', dayIds)
    : { data: [] }

  const { data: favorites } = dayIds.length
    ? await supabaseAdmin
      .from('calendar_day_favorites')
      .select('day_id, user_id')
      .in('day_id', dayIds)
    : { data: [] }

  const photoByDay = new Map()
  for (const photo of photos ?? []) {
    const list = photoByDay.get(photo.day_id) ?? []
    list.push(photo.photo_url)
    photoByDay.set(photo.day_id, list)
  }

  const ratingByDay = new Map()
  for (const rating of ratings ?? []) {
    const list = ratingByDay.get(rating.day_id) ?? []
    list.push(rating)
    ratingByDay.set(rating.day_id, list)
  }

  const favoritesByDay = new Map()
  for (const favorite of favorites ?? []) {
    const list = favoritesByDay.get(favorite.day_id) ?? []
    list.push(favorite.user_id)
    favoritesByDay.set(favorite.day_id, list)
  }

  const items = await Promise.all(
    (days ?? []).map(async (day) => {
      const photoUrls = (photoByDay.get(day.id) ?? [])
      const signedPhotos = await Promise.all(photoUrls.map(getSignedImageUrl))

      const dayRatings = ratingByDay.get(day.id) ?? []
      const ratingSum = dayRatings.reduce(
        (total, entry) => total + Number(entry.rating ?? 0),
        0
      )
      const avgRating = dayRatings.length ? ratingSum / dayRatings.length : null

      const favoriteUsers = favoritesByDay.get(day.id) ?? []

      return {
        id: day.id,
        day_date: day.day_date,
        photos: signedPhotos.filter(Boolean),
        ratings: dayRatings,
        rating_avg: avgRating !== null ? Number(avgRating.toFixed(1)) : null,
        favorite_count: favoriteUsers.length,
        favorite_users: favoriteUsers
      }
    })
  )

  return res.json({ items })
})

app.post(
  '/calendar/day/:dayId/rating',
  requireAuth,
  requireCouple,
  async (req, res) => {
    const { dayId } = req.params
    const { rating } = req.body

    const ratingValue = Number(rating)
    if (Number.isNaN(ratingValue)) {
      return res.status(400).json({ error: 'rating requerido.' })
    }

    const clampedRating = Math.min(Math.max(ratingValue, 0), 10)

    const { data: day, error: dayError } = await supabaseAdmin
      .from('calendar_days')
      .select('id')
      .eq('id', dayId)
      .eq('couple_id', req.user.coupleId)
      .maybeSingle()

    if (dayError || !day) {
      return res.status(404).json({ error: 'Dia no encontrado.' })
    }

    const { data, error } = await supabaseAdmin
      .from('calendar_day_ratings')
      .upsert(
        {
          day_id: dayId,
          user_id: req.user.id,
          rating: clampedRating
        },
        {
          onConflict: 'day_id,user_id'
        }
      )
      .select('*')
      .single()

    if (error) {
      return res.status(500).json({ error: error.message })
    }

    return res.status(201).json({ rating: data })
  }
)

app.post(
  '/calendar/day/:dayId/favorite',
  requireAuth,
  requireCouple,
  async (req, res) => {
    const { dayId } = req.params

    const { data: day, error: dayError } = await supabaseAdmin
      .from('calendar_days')
      .select('id, couple_id')
      .eq('id', dayId)
      .eq('couple_id', req.user.coupleId)
      .maybeSingle()

    if (dayError || !day) {
      return res.status(404).json({ error: 'Dia no encontrado.' })
    }

    const { data: existing } = await supabaseAdmin
      .from('calendar_day_favorites')
      .select('id')
      .eq('day_id', dayId)
      .eq('user_id', req.user.id)
      .maybeSingle()

    if (existing?.id) {
      const { error: deleteError } = await supabaseAdmin
        .from('calendar_day_favorites')
        .delete()
        .eq('id', existing.id)

      if (deleteError) {
        return res.status(500).json({ error: deleteError.message })
      }

      return res.json({ favorite: false })
    }

    const { count, error: countError } = await supabaseAdmin
      .from('calendar_day_favorites')
      .select('*', { count: 'exact', head: true })
      .eq('couple_id', req.user.coupleId)
      .eq('user_id', req.user.id)

    if (countError) {
      return res.status(500).json({ error: countError.message })
    }

    if ((count ?? 0) >= 10) {
      return res.status(409).json({ error: 'Maximo 10 dias favoritos.' })
    }

    const { error: insertError } = await supabaseAdmin
      .from('calendar_day_favorites')
      .insert({
        day_id: dayId,
        couple_id: req.user.coupleId,
        user_id: req.user.id
      })

    if (insertError) {
      return res.status(500).json({ error: insertError.message })
    }

    return res.json({ favorite: true })
  }
)

app.post(
  '/calendar/day/:dayId/photos',
  requireAuth,
  requireCouple,
  async (req, res) => {
    const { dayId } = req.params
    const { photoUrl, position } = req.body

    if (!photoUrl) {
      return res.status(400).json({ error: 'photoUrl requerido.' })
    }

    const { count, error: countError } = await supabaseAdmin
      .from('calendar_photos')
      .select('*', { count: 'exact', head: true })
      .eq('day_id', dayId)

    if (countError) {
      return res.status(500).json({ error: countError.message })
    }

    if ((count ?? 0) >= 5) {
      return res.status(409).json({ error: 'Maximo 5 fotos por dia.' })
    }

    const { data, error } = await supabaseAdmin
      .from('calendar_photos')
      .insert({
        day_id: dayId,
        photo_url: photoUrl,
        position: position ?? 0
      })
      .select('*')
      .single()

    if (error) {
      return res.status(500).json({ error: error.message })
    }

    return res.status(201).json({ photo: data })
  }
)

app.get('/photos', requireAuth, async (req, res) => {
  const { scope = 'couple', date, limit } = req.query
  const normalizedScope = String(scope)
  const dateFilter = normalizeDate(date)
  const limitValue = Number(limit)
  const maxItems = Number.isFinite(limitValue) ? Math.max(limitValue, 1) : 10

  const prefixes = []
  if (normalizedScope === 'user' || normalizedScope === 'all') {
    prefixes.push(`user/${req.user.id}`)
  }
  if (normalizedScope === 'couple' || normalizedScope === 'all') {
    if (!req.user.coupleId) {
      return res.status(409).json({ error: 'Usuario sin pareja.' })
    }
    prefixes.push(`couple/${req.user.coupleId}`)
  }

  try {
    const lists = await Promise.all(prefixes.map((prefix) => listStorageFiles(prefix)))
    const allFiles = lists.flat()

    const items = allFiles
      .map((item) => {
        const dateValue = extractDateFromName(item.name) ?? null
        return {
          id: item.path,
          path: item.path,
          date: dateValue,
          createdAt: item.updatedAt ?? null
        }
      })
      .filter((item) => (date ? item.date === dateFilter : true))
      .sort((a, b) => {
        const aTime = new Date(a.createdAt ?? `${a.date ?? ''}T00:00:00Z`).getTime()
        const bTime = new Date(b.createdAt ?? `${b.date ?? ''}T00:00:00Z`).getTime()
        return bTime - aTime
      })
      .slice(0, date ? undefined : maxItems)

    const signedItems = await Promise.all(
      items.map(async (item) => ({
        ...item,
        url: await getSignedImageUrl(item.path)
      }))
    )

    return res.json({ items: signedItems })
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
})

app.get('/photos/dates', requireAuth, async (req, res) => {
  const { scope = 'couple' } = req.query
  const normalizedScope = String(scope)

  const prefixes = []
  if (normalizedScope === 'user' || normalizedScope === 'all') {
    prefixes.push(`user/${req.user.id}`)
  }
  if (normalizedScope === 'couple' || normalizedScope === 'all') {
    if (!req.user.coupleId) {
      return res.status(409).json({ error: 'Usuario sin pareja.' })
    }
    prefixes.push(`couple/${req.user.coupleId}`)
  }

  try {
    const lists = await Promise.all(prefixes.map((prefix) => listStorageFiles(prefix)))
    const allFiles = lists.flat()
    const dates = new Set()

    for (const item of allFiles) {
      const dateValue = extractDateFromName(item.name)
      if (dateValue) {
        dates.add(dateValue)
      }
    }

    const ordered = Array.from(dates).sort().reverse()
    return res.json({ items: ordered })
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
})

app.get('/reviews/types', requireAuth, async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('review_types')
    .select('key, label, sort_order')
    .order('sort_order', { ascending: true })

  if (error) {
    return res.status(500).json({ error: error.message })
  }

  return res.json({ items: data ?? [] })
})

app.get('/reviews', requireAuth, requireCouple, async (req, res) => {
  const { type } = req.query

  let query = supabaseAdmin
    .from('reviews')
    .select('id, name, type, photo_url, created_at, review_entries(author_id, rating, review_text, created_at)')
    .eq('couple_id', req.user.coupleId)

  if (type) {
    query = query.eq('type', type)
  }

  const { data, error } = await query.order('created_at', { ascending: false })

  if (error) {
    return res.status(500).json({ error: error.message })
  }

  const items = await Promise.all((data ?? []).map(async (review) => {
    const entries = Array.isArray(review.review_entries)
      ? review.review_entries
      : []
    const ratingSum = entries.reduce(
      (total, entry) => total + Number(entry.rating ?? 0),
      0
    )
    const ratingAvg = entries.length ? ratingSum / entries.length : null
    const latest = entries
      .slice()
      .sort(
        (a, b) =>
          new Date(b.created_at ?? 0).getTime() -
          new Date(a.created_at ?? 0).getTime()
      )[0]

    return {
      id: review.id,
      name: review.name,
      type: review.type,
      photo_url: await getSignedImageUrl(review.photo_url),
      created_at: review.created_at,
      rating_avg: ratingAvg !== null ? Number(ratingAvg.toFixed(1)) : null,
      review_text: latest?.review_text ?? null,
      author_id: latest?.author_id ?? null,
      entries: entries.map((entry) => ({
        author_id: entry.author_id ?? null,
        rating: entry.rating ?? null,
        review_text: entry.review_text ?? null,
        created_at: entry.created_at ?? null
      }))
    }
  }))

  return res.json({ items })
})

app.post('/reviews', requireAuth, requireCouple, async (req, res) => {
  const { name, type, photoUrl, rating, reviewText } = req.body

  if (!name || !type) {
    return res.status(400).json({ error: 'name y type requeridos.' })
  }

  const ratingValue = Number(rating)
  if (Number.isNaN(ratingValue)) {
    return res.status(400).json({ error: 'rating requerido.' })
  }

  const clampedRating = Math.min(Math.max(ratingValue, 0), 10)

  const { data: review, error: reviewError } = await supabaseAdmin
    .from('reviews')
    .insert({
      couple_id: req.user.coupleId,
      name,
      photo_url: photoUrl ?? null,
      type
    })
    .select('*')
    .single()

  if (reviewError) {
    return res.status(500).json({ error: reviewError.message })
  }

  const { data: entry, error: entryError } = await supabaseAdmin
    .from('review_entries')
    .insert({
      review_id: review.id,
      author_id: req.user.id,
      review_text: reviewText ?? null,
      rating: clampedRating
    })
    .select('*')
    .single()

  if (entryError) {
    return res.status(500).json({ error: entryError.message })
  }

  await createHomeNotification({
    coupleId: req.user.coupleId,
    actorId: req.user.id,
    action: 'create_review',
    entityType: 'review',
    entityId: review.id,
    message: `Creo una resena: ${name}.`
  })

  return res.status(201).json({ review, entry })
})

app.post('/reviews/:id/entries', requireAuth, requireCouple, async (req, res) => {
  const { id } = req.params
  const { rating, reviewText } = req.body

  const ratingValue = Number(rating)
  if (Number.isNaN(ratingValue)) {
    return res.status(400).json({ error: 'rating requerido.' })
  }

  const clampedRating = Math.min(Math.max(ratingValue, 0), 10)

  const { data: review, error: reviewError } = await supabaseAdmin
    .from('reviews')
    .select('id, couple_id')
    .eq('id', id)
    .eq('couple_id', req.user.coupleId)
    .maybeSingle()

  if (reviewError || !review) {
    return res.status(404).json({ error: 'Resena no encontrada.' })
  }

  const { data: existingEntry } = await supabaseAdmin
    .from('review_entries')
    .select('id')
    .eq('review_id', id)
    .eq('author_id', req.user.id)
    .maybeSingle()

  if (existingEntry) {
    return res.status(409).json({ error: 'Ya tienes una resena para este item.' })
  }

  const { data: entry, error: entryError } = await supabaseAdmin
    .from('review_entries')
    .insert({
      review_id: id,
      author_id: req.user.id,
      review_text: reviewText ?? null,
      rating: clampedRating
    })
    .select('*')
    .single()

  if (entryError) {
    return res.status(500).json({ error: entryError.message })
  }

  return res.status(201).json({ entry })
})

app.patch('/reviews/:id/photo', requireAuth, requireCouple, async (req, res) => {
  const { id } = req.params
  const { photoUrl } = req.body

  if (!photoUrl) {
    return res.status(400).json({ error: 'photoUrl requerido.' })
  }

  const { data, error } = await supabaseAdmin
    .from('reviews')
    .update({ photo_url: photoUrl })
    .eq('id', id)
    .eq('couple_id', req.user.coupleId)
    .select('*')
    .single()

  if (error) {
    return res.status(500).json({ error: error.message })
  }

  return res.json({ review: data })
})

app.post('/profiles/update', async (req, res) => {
  const {
    userId,
    alias,
    photoUrl,
    themeLight,
    themeDark,
    birthday,
    favoriteFood,
    personalityType,
    whatsappUrl,
    instagramUrl,
    tiktokUrl,
    linkedinUrl
  } = req.body

  if (!userId) {
    return res.status(400).json({ error: 'userId es requerido.' })
  }

  const updates = {}

  if (typeof alias === 'string') {
    updates.alias = alias.trim() || null
  }

  if (typeof photoUrl === 'string') {
    updates.photo_url = photoUrl
  }

  if (typeof birthday === 'string') {
    updates.birthday = birthday.trim() || null
  }

  if (typeof favoriteFood === 'string') {
    updates.favorite_food = favoriteFood.trim() || null
  }

  if (typeof personalityType === 'string') {
    updates.personality_type = personalityType.trim() || null
  }

  if (typeof whatsappUrl === 'string') {
    updates.whatsapp_url = whatsappUrl.trim() || null
  }

  if (typeof instagramUrl === 'string') {
    updates.instagram_url = instagramUrl.trim() || null
  }

  if (typeof tiktokUrl === 'string') {
    updates.tiktok_url = tiktokUrl.trim() || null
  }

  if (typeof linkedinUrl === 'string') {
    updates.linkedin_url = linkedinUrl.trim() || null
  }

  if (themeLight === null) {
    updates.theme_light = null
  } else if (themeLight && typeof themeLight === 'object' && !Array.isArray(themeLight)) {
    updates.theme_light = themeLight
  }

  if (themeDark === null) {
    updates.theme_dark = null
  } else if (themeDark && typeof themeDark === 'object' && !Array.isArray(themeDark)) {
    updates.theme_dark = themeDark
  }

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: 'No hay cambios para guardar.' })
  }

  const { data, error } = await supabaseAdmin
    .from('profiles')
    .update(updates)
    .eq('user_id', userId)
    .select('user_id, alias, email, couple_id, photo_url, theme_light, theme_dark, birthday, favorite_food, personality_type, whatsapp_url, instagram_url, tiktok_url, linkedin_url, terms_accepted_at')
    .single()

  const signedProfilePhoto = await getSignedImageUrl(data?.photo_url)

  if (error) {
    return res.status(500).json({ error: error.message })
  }

  return res.json({
    profile: {
      ...data,
      photo_url: signedProfilePhoto,
      photo_path: data?.photo_url ?? null
    }
  })
})

app.post('/profiles/accept-terms', requireAuth, async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .update({ terms_accepted_at: new Date().toISOString() })
    .eq('user_id', req.user.id)
    .select('user_id, terms_accepted_at')
    .single()

  if (error) {
    return res.status(500).json({ error: error.message })
  }

  return res.json({ profile: data })
})

app.post('/profiles/push-token', requireAuth, async (req, res) => {
  const { token } = req.body

  if (!token || typeof token !== 'string') {
    return res.status(400).json({ error: 'token requerido.' })
  }

  const { data, error } = await supabaseAdmin
    .from('profiles')
    .update({ expo_push_token: token })
    .eq('user_id', req.user.id)
    .select('user_id, expo_push_token')
    .single()

  if (error) {
    return res.status(500).json({ error: error.message })
  }

  return res.json({ profile: data })
})

app.get('/profiles', requireAuth, requireCouple, async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('user_id, alias, email, couple_id, photo_url, birthday, favorite_food, personality_type, whatsapp_url, instagram_url, tiktok_url, linkedin_url, created_at')
    .eq('couple_id', req.user.coupleId)

  if (error) {
    return res.status(500).json({ error: error.message })
  }

  const items = await Promise.all(
    (data ?? []).map(async (profile) => ({
      ...profile,
      photo_url: await getSignedImageUrl(profile.photo_url),
      photo_path: profile.photo_url ?? null
    }))
  )

  return res.json({ items })
})

app.post('/profiles/generate-code', async (req, res) => {
  const { userId } = req.body

  if (!userId) {
    return res.status(400).json({ error: 'userId es requerido.' })
  }

  let lastError = null

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = generateCode(6)

    const { data, error } = await supabaseAdmin
      .from('profiles')
      .update({ connect_code: code })
      .eq('user_id', userId)
      .select('connect_code')
      .single()

    if (!error) {
      return res.json({ code: data.connect_code })
    }

    lastError = error
  }

  return res.status(500).json({ error: lastError?.message ?? 'No se pudo generar codigo.' })
})

app.post('/couples/connect', async (req, res) => {
  const { userId, code } = req.body

  if (!userId || !code) {
    return res.status(400).json({ error: 'userId y code son requeridos.' })
  }

  const { data: currentProfile, error: currentError } = await supabaseAdmin
    .from('profiles')
    .select('user_id, couple_id')
    .eq('user_id', userId)
    .single()

  if (currentError) {
    return res.status(404).json({ error: 'Perfil no encontrado.' })
  }

  if (currentProfile.couple_id) {
    return res.status(409).json({ error: 'El usuario ya tiene pareja.' })
  }

  const { data: otherProfile, error: otherError } = await supabaseAdmin
    .from('profiles')
    .select('user_id, couple_id')
    .eq('connect_code', code)
    .single()

  if (otherError || !otherProfile) {
    return res.status(404).json({ error: 'Codigo no valido.' })
  }

  if (otherProfile.user_id === userId) {
    return res.status(400).json({ error: 'No puedes usar tu propio codigo.' })
  }

  if (otherProfile.couple_id) {
    return res.status(409).json({ error: 'La otra persona ya tiene pareja.' })
  }

  const coupleCode = generateCode(8)

  const { data: coupleData, error: coupleError } = await supabaseAdmin
    .from('couples')
    .insert({ code: coupleCode, member_count: 2 })
    .select('id, code, member_count, relationship_start_date, meet_date')
    .single()

  if (coupleError) {
    return res.status(500).json({ error: coupleError.message })
  }

  const { error: updateError } = await supabaseAdmin
    .from('profiles')
    .update({ couple_id: coupleData.id, connect_code: null })
    .in('user_id', [userId, otherProfile.user_id])

  if (updateError) {
    return res.status(500).json({ error: updateError.message })
  }

  return res.json({ couple: coupleData })
})

app.patch(
  '/couples/relationship-start-date',
  requireAuth,
  requireCouple,
  async (req, res) => {
    const { relationshipStartDate, meetDate } = req.body

    if (!relationshipStartDate && !meetDate) {
      return res.status(400).json({ error: 'No hay cambios para guardar.' })
    }

    const updates = {}

    if (relationshipStartDate) {
      const parsed = new Date(relationshipStartDate)
      if (Number.isNaN(parsed.getTime())) {
        return res.status(400).json({ error: 'Fecha invalida.' })
      }
      updates.relationship_start_date = parsed.toISOString().slice(0, 10)
    }

    if (meetDate) {
      const parsed = new Date(meetDate)
      if (Number.isNaN(parsed.getTime())) {
        return res.status(400).json({ error: 'Fecha invalida.' })
      }
      updates.meet_date = parsed.toISOString().slice(0, 10)
    }

    const { data, error } = await supabaseAdmin
      .from('couples')
      .update(updates)
      .eq('id', req.user.coupleId)
      .select('id, code, member_count, relationship_start_date, meet_date')
      .single()

    if (error) {
      return res.status(500).json({ error: error.message })
    }

    return res.json({ couple: data })
  }
)

app.post('/upload', requireAuth, upload.single('image'), async (req, res) => {
  try {
    const file = req.file
    if (!file) {
      return res.status(400).json({ error: 'Archivo requerido.' })
    }

    const scope = req.body?.scope ?? 'couple'
    const model = req.body?.model
    const modelId = req.body?.modelId

    if (!model || !modelId) {
      return res.status(400).json({ error: 'model y modelId requeridos.' })
    }

    const scopeValue = scope === 'user' ? 'user' : 'couple'
    const scopeId = scopeValue === 'user' ? req.user.id : req.user.coupleId

    if (!scopeId) {
      return res.status(409).json({ error: 'Usuario sin pareja.' })
    }

    const safeModel = sanitizeSegment(model)
    const safeModelId = sanitizeSegment(modelId)
    const dateValue = normalizeDate(req.body?.date)
    const extension = path.extname(file.originalname || '').toLowerCase() || '.jpg'
    const safeOriginal = sanitizeSegment(path.basename(file.originalname || 'image', extension))
    const fileName = `${dateValue}_${Date.now()}_${safeOriginal}${extension}`
    const filePath = `${scopeValue}/${scopeId}/${safeModel}/${safeModelId}/${fileName}`

    const { error } = await supabaseAdmin.storage
      .from(IMAGE_BUCKET)
      .upload(filePath, file.buffer, {
        contentType: file.mimetype
      })

    if (error) throw error

    const signedUrl = await getSignedImageUrl(filePath)

    res.json({
      message: 'Imagen subida',
      fileName,
      path: filePath,
      signedUrl
    })
  } catch (err) {
    console.error('upload failed', err)
    res.status(500).json({ error: err.message })
  }
})

const port = process.env.PORT || 3000

async function startServer() {
  try {
    await ensureDebugUser()
    if (process.env.DEBUG_CONNECT_CODE) {
      console.log('Debug user listo con codigo de conexion.')
    }
  } catch (err) {
    console.warn('No se pudo preparar el usuario debug:', err.message)
  }

  app.listen(port, () => {
    console.log(`Servidor corriendo en puerto ${port}`)
  })
}

if (require.main === module) {
  startServer()
}

module.exports = app
