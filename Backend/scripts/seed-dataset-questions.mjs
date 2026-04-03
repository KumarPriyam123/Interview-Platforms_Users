/**
 * Seed DatasetQuestion collection in the jobsaarthi MongoDB database.
 *
 * Re-uses the ai-interview-service import script by running it with
 * MONGODB_DB=jobsaarthi so questions land in the main backend database.
 *
 * Usage:
 *   node Backend/scripts/seed-dataset-questions.mjs
 *
 * Prerequisites:
 *   pip install kagglehub pymongo python-dotenv pandas
 *   (or)  pip install -r ai-interview-service/scripts/requirements-dataset-import.txt
 */

import { execSync } from 'child_process'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..', '..')
const IMPORT_SCRIPT = path.join(ROOT, 'ai-interview-service', 'scripts', 'import_leetcode_to_mongo.py')

if (!fs.existsSync(IMPORT_SCRIPT)) {
  console.error(`Import script not found: ${IMPORT_SCRIPT}`)
  process.exit(1)
}

// Resolve a working Python executable that has the required packages.
function findPython() {
  const candidates = process.platform === 'win32'
    ? ['python3', 'python', 'py -3',
       `"${process.env.LOCALAPPDATA}\\Microsoft\\WindowsApps\\python.exe"`,
       `"${process.env.LOCALAPPDATA}\\Programs\\Python\\Python313\\python.exe"`,
       `"${process.env.LOCALAPPDATA}\\Programs\\Python\\Python312\\python.exe"`]
    : ['python3', 'python']

  for (const cmd of candidates) {
    try {
      execSync(`${cmd} -c "import kagglehub, pymongo"`, { stdio: 'ignore' })
      return cmd
    } catch { /* try next */ }
  }
  return null
}

const pythonCmd = findPython()
if (!pythonCmd) {
  console.error('No Python with kagglehub + pymongo found.')
  console.error('Run: pip install kagglehub pymongo python-dotenv pandas')
  process.exit(1)
}

if (!fs.existsSync(IMPORT_SCRIPT)) {
  console.error(`Import script not found: ${IMPORT_SCRIPT}`)
  process.exit(1)
}

console.log('Seeding DatasetQuestion collection into jobsaarthi database...')
console.log(`Python: ${pythonCmd}`)
console.log(`Running: ${IMPORT_SCRIPT}`)

try {
  execSync(`${pythonCmd} "${IMPORT_SCRIPT}"`, {
    stdio: 'inherit',
    cwd: path.join(ROOT, 'ai-interview-service'),
    env: {
      ...process.env,
      MONGODB_DB: 'jobsaarthi',
    },
  })
  console.log('\nSeed complete! DatasetQuestion data is now in the jobsaarthi database.')
} catch (err) {
  console.error('Seed failed:', err.message)
  process.exit(1)
}
