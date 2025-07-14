#!/usr/bin/env node

/**
 * Simple test runner for Outside-In development
 * Runs acceptance tests and provides feedback on failing tests
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🎵 PlayTime - Outside-In Test Runner\n');

// Check if dependencies are installed
if (!fs.existsSync('node_modules')) {
    console.log('📦 Installing dependencies...');
    try {
        execSync('npm install', { stdio: 'inherit' });
    } catch (error) {
        console.error('❌ Failed to install dependencies');
        process.exit(1);
    }
}

// Check if basic application files exist
const requiredFiles = [
    'index.html',
    'styles/main.css',
    'scripts/main.js'
];

const missingFiles = requiredFiles.filter(file => !fs.existsSync(file));

if (missingFiles.length > 0) {
    console.log('📝 Creating missing application files...\n');
    
    // Create basic scripts directory and placeholder files
    if (!fs.existsSync('scripts')) {
        fs.mkdirSync('scripts', { recursive: true });
    }
    
    // Create placeholder JavaScript files
    const jsFiles = ['main.js', 'pdf-viewer.js', 'highlighting.js'];
    jsFiles.forEach(file => {
        const filePath = path.join('scripts', file);
        if (!fs.existsSync(filePath)) {
            fs.writeFileSync(filePath, `// ${file} - Placeholder for development\nconsole.log('${file} loaded');\n`);
            console.log(`✨ Created placeholder: scripts/${file}`);
        }
    });
}

// Create basic test PDF fixtures
const fixturesDir = 'tests/fixtures';
if (!fs.existsSync(fixturesDir)) {
    fs.mkdirSync(fixturesDir, { recursive: true });
}

// Check if we have test fixtures (we'll create minimal PDFs for testing)
const requiredFixtures = ['sample-score.pdf', 'another-score.pdf'];
const missingFixtures = requiredFixtures.filter(file => 
    !fs.existsSync(path.join(fixturesDir, file))
);

if (missingFixtures.length > 0) {
    console.log('\n📋 Test fixtures missing - you will need to create sample PDF files:');
    missingFixtures.forEach(file => {
        console.log(`   - ${fixturesDir}/${file}`);
    });
    console.log('\nFor now, tests will be skipped that require these files.\n');
}

console.log('🚀 Starting acceptance tests...\n');

try {
    // Run the tests
    execSync('npm test', { stdio: 'inherit' });
} catch (error) {
    console.log('\n❌ Tests failed (this is expected in Outside-In development!)');
    console.log('\n📋 Next steps:');
    console.log('1. Review the failing tests to understand what needs to be implemented');
    console.log('2. Implement the minimal code to make the first test pass');
    console.log('3. Run tests again and repeat until all tests pass');
    console.log('4. Refactor and improve the implementation');
    console.log('\n💡 Use "npm run test:watch" to run tests continuously during development');
}

console.log('\n🎯 Outside-In Development Cycle:');
console.log('   RED → GREEN → REFACTOR → REPEAT');
console.log('\nHappy coding! 🎵');
