import sharp from 'sharp'
import { readFileSync, mkdirSync } from 'fs'

mkdirSync('build', { recursive: true })

const svg = readFileSync('public/favicon.svg')

await sharp(svg).resize(1024, 1024).png().toFile('build/icon.png')
console.log('Generated build/icon.png (1024x1024)')
