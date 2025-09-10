const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔍 Checking GitHub Repository Status...\n');

// Check if we're in a git repository
try {
  const gitStatus = execSync('git status --porcelain', { encoding: 'utf8' });
  
  if (gitStatus.trim()) {
    console.log('📝 Uncommitted changes found:');
    console.log(gitStatus);
  } else {
    console.log('✅ Working directory is clean - no uncommitted changes');
  }
} catch (error) {
  console.log('❌ Not a git repository or git not available');
  console.log('Error:', error.message);
}

// Check current branch
try {
  const currentBranch = execSync('git branch --show-current', { encoding: 'utf8' }).trim();
  console.log(`📍 Current branch: ${currentBranch}`);
} catch (error) {
  console.log('❌ Could not determine current branch');
}

// Check remote status
try {
  const remoteUrl = execSync('git remote get-url origin', { encoding: 'utf8' }).trim();
  console.log(`🌐 Remote origin: ${remoteUrl}`);
} catch (error) {
  console.log('❌ No remote origin configured');
}

// Check last commit
try {
  const lastCommit = execSync('git log -1 --oneline', { encoding: 'utf8' }).trim();
  console.log(`📝 Last commit: ${lastCommit}`);
} catch (error) {
  console.log('❌ Could not get last commit info');
}

// Check if we're ahead/behind remote
try {
  const status = execSync('git status -b --porcelain', { encoding: 'utf8' });
  const branchLine = status.split('\n')[0];
  if (branchLine.includes('ahead')) {
    console.log('⬆️  Local branch is ahead of remote - changes need to be pushed');
  } else if (branchLine.includes('behind')) {
    console.log('⬇️  Local branch is behind remote - need to pull changes');
  } else {
    console.log('✅ Local branch is up to date with remote');
  }
} catch (error) {
  console.log('❌ Could not check remote status');
}

// Check key files exist
const keyFiles = [
  'package.json',
  'src/App.tsx',
  'src/components/Dashboard.tsx',
  'src/components/FitbitSync.tsx',
  'src/components/GitHubUpdate.tsx',
  'src/lib/fitbit.ts',
  'src/lib/github.ts',
  'deploy.sh',
  'health-check.sh',
  'configure-nginx.sh',
  'setup-server.sh',
  'README.md'
];

console.log('\n📁 Checking key files:');
keyFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`✅ ${file}`);
  } else {
    console.log(`❌ ${file} - MISSING`);
  }
});

// Check Supabase migrations
const migrationsDir = 'supabase/migrations';
if (fs.existsSync(migrationsDir)) {
  const migrations = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql'));
  console.log(`\n🗄️  Supabase migrations (${migrations.length} files):`);
  migrations.forEach(migration => {
    console.log(`   ${migration}`);
  });
} else {
  console.log('\n❌ Supabase migrations directory not found');
}

console.log('\n🔧 Environment Configuration:');
if (fs.existsSync('.env')) {
  console.log('✅ .env file exists');
} else {
  console.log('❌ .env file missing');
}

if (fs.existsSync('.env.example')) {
  console.log('✅ .env.example file exists');
} else {
  console.log('❌ .env.example file missing');
}