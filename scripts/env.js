#!/usr/bin/env node

/**
 * Environment Management Script for VATpilot
 * Usage: node scripts/env.js [development|production]
 */

import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const rootDir = join(__dirname, '..')

const environments = {
  development: {
    server: '.env.development',
    client: '.env.development'
  },
  production: {
    server: '.env.railway', 
    client: '.env.netlify'
  }
}

function switchEnvironment(env) {
  if (!environments[env]) {
    console.error(`❌ Invalid environment: ${env}`)
    console.log('Available environments: development, production')
    process.exit(1)
  }

  const config = environments[env]
  
  try {
    // Switch server environment
    const serverSourcePath = join(rootDir, 'server', config.server)
    const serverTargetPath = join(rootDir, 'server', '.env')
    
    if (existsSync(serverSourcePath)) {
      const serverContent = readFileSync(serverSourcePath, 'utf8')
      writeFileSync(serverTargetPath, serverContent)
      console.log(`✅ Server environment switched to ${env}`)
    } else {
      console.log(`⚠️ Server environment file not found: ${config.server}`)
    }

    // Switch client environment  
    const clientSourcePath = join(rootDir, 'client', config.client)
    const clientTargetPath = join(rootDir, 'client', '.env')
    
    if (existsSync(clientSourcePath)) {
      const clientContent = readFileSync(clientSourcePath, 'utf8')
      writeFileSync(clientTargetPath, clientContent)
      console.log(`✅ Client environment switched to ${env}`)
    } else {
      console.log(`⚠️ Client environment file not found: ${config.client}`)
    }

    console.log(`\n🚀 Environment switched to: ${env.toUpperCase()}`)
    
    if (env === 'development') {
      console.log('\n📝 Ready for development:')
      console.log('   cd server && npm run dev')
      console.log('   cd client && npm run dev')
    } else {
      console.log('\n🌐 Ready for production testing:')
      console.log('   cd server && npm run start:prod') 
      console.log('   cd client && npm run build && npm run preview')
    }

  } catch (error) {
    console.error('❌ Error switching environment:', error.message)
    process.exit(1)
  }
}

// Get environment from command line argument
const targetEnv = process.argv[2] || 'development'
switchEnvironment(targetEnv)