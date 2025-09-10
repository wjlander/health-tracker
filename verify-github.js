import fs from 'fs';

console.log('🔧 GitHub Integration Configuration Check\n');

// Check environment variables
const envFile = '.env.example';
if (fs.existsSync(envFile)) {
  const envContent = fs.readFileSync(envFile, 'utf8');
  
  console.log('📋 Environment variables from .env.example:');
  const githubVars = envContent.split('\n').filter(line => 
    line.includes('GITHUB') && !line.startsWith('#')
  );
  
  githubVars.forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
      console.log(`   ${key}: ${value.length > 20 ? value.substring(0, 20) + '...' : value}`);
    }
  });
} else {
  console.log('❌ .env.example file not found');
}

// Check if GitHub integration files exist
const githubFiles = [
  'src/lib/github.ts',
  'src/components/GitHubUpdate.tsx'
];

console.log('\n📁 GitHub Integration Files:');
githubFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`✅ ${file}`);
    
    // Check file size to ensure it's not empty
    const stats = fs.statSync(file);
    console.log(`   Size: ${stats.size} bytes`);
  } else {
    console.log(`❌ ${file} - MISSING`);
  }
});

// Check deployment scripts
const deploymentFiles = [
  'deploy.sh',
  'setup-server.sh',
  'configure-nginx.sh',
  'health-check.sh'
];

console.log('\n🚀 Deployment Scripts:');
deploymentFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`✅ ${file}`);
    
    // Check if executable
    try {
      const stats = fs.statSync(file);
      const isExecutable = (stats.mode & parseInt('111', 8)) !== 0;
      console.log(`   Executable: ${isExecutable ? 'Yes' : 'No'}`);
    } catch (error) {
      console.log(`   Could not check permissions`);
    }
  } else {
    console.log(`❌ ${file} - MISSING`);
  }
});

console.log('\n📊 Repository Health Summary:');
console.log('This script checks the local repository state.');
console.log('To verify GitHub repository status, you would need to:');
console.log('1. Check git status for uncommitted changes');
console.log('2. Push any local changes to GitHub');
console.log('3. Verify the repository contains all necessary files');
console.log('4. Test the GitHub deployment integration');