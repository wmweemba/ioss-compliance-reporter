#!/usr/bin/env node

// Railway environment variable loader
// This script explicitly loads Railway environment variables before starting the server

console.log('🚂 Railway Environment Variable Loader')
console.log('Available environment variables:')

// Log all environment variables for debugging
Object.keys(process.env).forEach(key => {
  if (key.startsWith('VATPILOT_') || key.startsWith('RAILWAY_') || ['NODE_ENV', 'PORT'].includes(key)) {
    console.log(`${key}:`, key.startsWith('VATPILOT_') ? 'configured' : process.env[key])
  }
})

// Check if Railway environment variables are available
const railwayVars = Object.keys(process.env).filter(key => key.startsWith('VATPILOT_'))
console.log('VATPILOT_ variables found:', railwayVars.length)

if (railwayVars.length === 0) {
  console.log('⚠️ No VATPILOT_ environment variables found')
  console.log('This might indicate a Railway environment variable configuration issue')
}

// Start the actual server
console.log('🚀 Starting main server...')
require('./server.js')