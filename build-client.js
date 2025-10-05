// build-client.js
process.env.NODE_ENV = 'production';

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function build() {
  try {
    console.log('Installing client dependencies...');
    await execAsync('npm --prefix client install');
    
    console.log('Building client...');
    await execAsync('npm --prefix client run build');
    
    console.log('Build complete!');
  } catch (error) {
    console.error('Build failed:', error);
    process.exit(1);
  }
}

build();