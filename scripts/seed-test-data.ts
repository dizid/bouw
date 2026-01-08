/**
 * Seed script for generating test data
 * Creates 220 sessions (houses 100-319) with 1-2 images each
 *
 * Usage: npm run seed
 */

import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

// Validate environment variables
const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env file')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Test worker names
const TEST_WORKERS = ['Test Werknemer 1', 'Test Werknemer 2', 'Test Werknemer 3']

// House number range
const HOUSE_START = 100
const HOUSE_END = 319

// Minimal 10x10 JPEG images with different colors (base64 encoded)
// These are tiny valid JPEG files with solid colors
const PLACEHOLDER_IMAGES = [
  // Red
  '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAAKAAoDASIAAhEBAxEB/8QAFgABAQEAAAAAAAAAAAAAAAAAAAYH/8QAHxAAAgICAQUAAAAAAAAAAAAAAQMCBAAFERIhMUFR/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAXEQEBAQEAAAAAAAAAAAAAAAABAAIR/9oADAMBEQCEEQA/ANc0+0t6rZV7NGMolGwB0kD0wMaHu9rJ7dpm7qIgZMg9pxjGKbZy/9k=',
  // Green
  '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAAKAAoDASIAAhEBAxEB/8QAFgABAQEAAAAAAAAAAAAAAAAAAAMH/8QAHxAAAgICAgMBAAAAAAAAAAAAAQIDBAAFERIxQWFx/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAP/xAAXEQEBAQEAAAAAAAAAAAAAAAABAAIR/9oADAMBEQCEEQA/ANR3W5saXW2tjahjKeWsDpIB8YGNJi97o7G+s3WRBCQeYhx24xjFNu5f/9k=',
  // Blue
  '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAAKAAoDASIAAhEBAxEB/8QAFgABAQEAAAAAAAAAAAAAAAAAAAUH/8QAHxAAAgICAgMBAAAAAAAAAAAAAQIDBAAFERIxQWFx/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAP/xAAXEQEBAQEAAAAAAAAAAAAAAAABAAIR/9oADAMBEQCEEQA/ANM3e6r6PV2tjfhjKeqsDpIA8YGND3ex0N7e2bxIghIPSA47cYximzcv/9k=',
  // Yellow
  '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAAKAAoDASIAAhEBAxEB/8QAFgABAQEAAAAAAAAAAAAAAAAAAAcI/8QAHxAAAgICAwADAAAAAAAAAAAAAQMCBAAFERIhMUFR/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAXEQEBAQEAAAAAAAAAAAAAAAABAAIR/9oADAMBEQCEEQA/ANR3W6saLV2tnfhjKeavLpIB4xoW92MnuLWbu4iAExB0nHbjGMU27l//2Q==',
  // Cyan
  '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAAKAAoDASIAAhEBAxEB/8QAFgABAQEAAAAAAAAAAAAAAAAAAAcI/8QAHxAAAgICAgMBAAAAAAAAAAAAAQIDBAAFERIxQWFx/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAXEQEBAQEAAAAAAAAAAAAAAAABAAIR/9oADAMBEQCEEQA/ANM3e7r6LV2tjfhDKeysDpIA8YGNl3ex0d9e2LxIghIPSI47cYximzcv/9k=',
  // Magenta
  '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAAKAAoDASIAAhEBAxEB/8QAFgABAQEAAAAAAAAAAAAAAAAAAAcI/8QAHxAAAgICAQUAAAAAAAAAAAAAAQIDBAAFERIxQWFx/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAXEQEBAQEAAAAAAAAAAAAAAAABAAIR/9oADAMBEQCEEQA/ANR3O6saXW2tjfhDKeavLpIB4xoe92Mnt7ObuoiAExB0nHbjGMU27l//2Q==',
  // Orange
  '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAAKAAoDASIAAhEBAxEB/8QAFgABAQEAAAAAAAAAAAAAAAAAAAYI/8QAHxAAAgICAQUAAAAAAAAAAAAAAQMCBAAFERIhMUFR/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAXEQEBAQEAAAAAAAAAAAAAAAABAAIR/9oADAMBEQCEEQA/ANc0+7t6bZV7NKMolGuA0kD0wMaHvNpJ7hom7qIgZMg9pxjGKbdy/9k=',
  // Purple
  '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAAKAAoDASIAAhEBAxEB/8QAFgABAQEAAAAAAAAAAAAAAAAAAAcI/8QAHxAAAgICAQUAAAAAAAAAAAAAAQIDBAAFERIxQWFx/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAXEQEBAQEAAAAAAAAAAAAAAAABAAIR/9oADAMBEQCEEQA/ANM3e6r6LV2tjfhDKeysDpIA8YGNl3ex0N9e2bxIghIPSI47cYximzcv/9k=',
]

// Utility functions
function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function randomDate(daysBack: number): string {
  const now = new Date()
  const past = new Date(now.getTime() - randomInt(0, daysBack) * 24 * 60 * 60 * 1000)
  return past.toISOString()
}

function generateStorageFilename(sessionId: string): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 8)
  return `${sessionId}/${timestamp}_${random}.jpg`
}

// Main seed function
async function seed() {
  console.log('Starting seed script...\n')

  // Step 1: Get or create test workers
  console.log('1. Setting up test workers...')
  const workerIds: string[] = []

  for (const name of TEST_WORKERS) {
    // Check if worker already exists
    const { data: existing } = await supabase
      .from('workers')
      .select('id')
      .eq('name', name)
      .single()

    if (existing) {
      workerIds.push(existing.id)
      console.log(`   Found existing worker: ${name}`)
    } else {
      // Create new worker
      const { data: newWorker, error } = await supabase
        .from('workers')
        .insert({ name, active: true })
        .select('id')
        .single()

      if (error) {
        console.error(`   Failed to create worker ${name}:`, error.message)
        continue
      }
      if (newWorker) {
        workerIds.push(newWorker.id)
        console.log(`   Created worker: ${name}`)
      }
    }
  }

  if (workerIds.length === 0) {
    console.error('No workers available. Exiting.')
    process.exit(1)
  }

  console.log(`   Total workers: ${workerIds.length}\n`)

  // Step 2: Create sessions for each house
  console.log('2. Creating sessions for houses 100-319...')
  let sessionsCreated = 0
  let photosUploaded = 0

  for (let houseNum = HOUSE_START; houseNum <= HOUSE_END; houseNum++) {
    // Check if session already exists for this house
    const { data: existingSession } = await supabase
      .from('job_sessions')
      .select('id')
      .eq('house_number', houseNum)
      .is('deleted_at', null)
      .limit(1)
      .single()

    if (existingSession) {
      console.log(`   House ${houseNum}: already has session, skipping`)
      continue
    }

    // Generate random session data
    const hasBinnen = Math.random() > 0.2 // 80% chance
    const hasBuiten = Math.random() > 0.3 // 70% chance
    const hasZonnescherm = Math.random() > 0.6 // 40% chance
    const hasGlasbreuk = Math.random() > 0.9 // 10% chance
    const hasDiversen = Math.random() > 0.8 // 20% chance

    const sessionData = {
      house_number: houseNum,
      worker_id: randomChoice(workerIds),
      created_at: randomDate(30), // Random date within last 30 days
      binnen_opruimen_min: hasBinnen ? randomInt(10, 45) : null,
      binnen_opruimen_opmerkingen: hasBinnen && Math.random() > 0.7 ? 'Test opmerking binnen' : null,
      buiten_balkon_min: hasBuiten ? randomInt(5, 30) : null,
      buiten_balkon_opmerkingen: hasBuiten && Math.random() > 0.8 ? 'Test opmerking buiten' : null,
      zonnescherm_verwijderd_min: hasZonnescherm ? randomInt(15, 60) : null,
      zonnescherm_terugplaatsen: hasZonnescherm ? Math.random() > 0.5 : null,
      zonnescherm_afstandverklaring: hasZonnescherm ? Math.random() > 0.7 : null,
      zonnescherm_opmerkingen: hasZonnescherm && Math.random() > 0.8 ? 'Zonnescherm notitie' : null,
      glasbreuk_min: hasGlasbreuk ? randomInt(20, 90) : null,
      glasbreuk_aantal: hasGlasbreuk ? randomInt(1, 3) : null,
      glasbreuk_opmerkingen: hasGlasbreuk ? 'Glasbreuk geregistreerd' : null,
      diversen_min: hasDiversen ? randomInt(5, 30) : null,
      diversen_opmerkingen: hasDiversen ? 'Diverse werkzaamheden' : null,
      bewoner_naam: hasDiversen && Math.random() > 0.5 ? `Bewoner ${houseNum}` : null,
      bewoner_telefoon: hasDiversen && Math.random() > 0.6 ? `06-${randomInt(10000000, 99999999)}` : null,
    }

    // Insert session
    const { data: session, error: sessionError } = await supabase
      .from('job_sessions')
      .insert(sessionData)
      .select('id')
      .single()

    if (sessionError) {
      console.error(`   House ${houseNum}: failed to create session:`, sessionError.message)
      continue
    }

    sessionsCreated++

    // Step 3: Upload 1-2 photos for this session
    const numPhotos = randomInt(1, 2)
    for (let i = 0; i < numPhotos; i++) {
      const imageBase64 = randomChoice(PLACEHOLDER_IMAGES)
      const imageBuffer = Buffer.from(imageBase64, 'base64')
      const storagePath = generateStorageFilename(session.id)

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('session-photos')
        .upload(storagePath, imageBuffer, {
          contentType: 'image/jpeg',
          upsert: false,
        })

      if (uploadError) {
        console.error(`   House ${houseNum}: failed to upload photo:`, uploadError.message)
        continue
      }

      // Insert photo metadata
      const { error: photoError } = await supabase.from('session_photos').insert({
        session_id: session.id,
        storage_path: storagePath,
        original_filename: `test_photo_${i + 1}.jpg`,
        file_size: imageBuffer.length,
      })

      if (photoError) {
        console.error(`   House ${houseNum}: failed to save photo metadata:`, photoError.message)
        continue
      }

      photosUploaded++
    }

    // Progress logging every 20 houses
    if ((houseNum - HOUSE_START + 1) % 20 === 0) {
      console.log(`   Progress: ${houseNum - HOUSE_START + 1}/${HOUSE_END - HOUSE_START + 1} houses...`)
    }
  }

  console.log(`\n3. Summary:`)
  console.log(`   Sessions created: ${sessionsCreated}`)
  console.log(`   Photos uploaded: ${photosUploaded}`)
  console.log(`\nSeed complete!`)
}

// Run the seed
seed().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
