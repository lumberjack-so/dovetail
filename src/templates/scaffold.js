import { promises as fs } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Scaffold a new PERN stack project
 */
export async function scaffoldProject(projectDir, config) {
  // Create project directory
  await fs.mkdir(projectDir, { recursive: true });

  // Create directory structure
  const dirs = [
    'apps/web/src/components',
    'apps/web/src/pages',
    'apps/web/src/utils',
    'apps/api/src/routes',
    'apps/api/src/controllers',
    'apps/api/src/middleware',
    'migrations',
    'tests',
    'docs',
    '.dovetail',
    '.claude/hooks',
  ];

  for (const dir of dirs) {
    await fs.mkdir(join(projectDir, dir), { recursive: true });
  }

  // Create package.json
  await fs.writeFile(
    join(projectDir, 'package.json'),
    JSON.stringify({
      name: config.slug,
      version: '1.0.0',
      description: config.projectName,
      type: 'module',
      scripts: {
        dev: 'concurrently "npm run dev:web" "npm run dev:api"',
        'dev:web': 'cd apps/web && npm run dev',
        'dev:api': 'cd apps/api && npm run dev',
        build: 'npm run build:web && npm run build:api',
        'build:web': 'cd apps/web && npm run build',
        'build:api': 'cd apps/api && npm run build',
        test: 'playwright test',
        'test:api': 'node --test apps/api/src/**/*.test.js',
      },
      workspaces: ['apps/*'],
      devDependencies: {
        '@playwright/test': '^1.40.0',
        concurrently: '^8.2.2',
      },
    }, null, 2)
  );

  // Create web app package.json
  await fs.writeFile(
    join(projectDir, 'apps/web/package.json'),
    JSON.stringify({
      name: `${config.slug}-web`,
      version: '1.0.0',
      type: 'module',
      scripts: {
        dev: 'vite',
        build: 'vite build',
        preview: 'vite preview',
      },
      dependencies: {
        react: '^18.2.0',
        'react-dom': '^18.2.0',
        'react-router-dom': '^6.20.0',
        '@supabase/supabase-js': '^2.38.0',
      },
      devDependencies: {
        '@vitejs/plugin-react': '^4.2.1',
        vite: '^5.0.0',
      },
    }, null, 2)
  );

  // Create API package.json
  await fs.writeFile(
    join(projectDir, 'apps/api/package.json'),
    JSON.stringify({
      name: `${config.slug}-api`,
      version: '1.0.0',
      type: 'module',
      scripts: {
        dev: 'node --watch src/index.js',
        start: 'node src/index.js',
      },
      dependencies: {
        express: '^4.18.2',
        '@supabase/supabase-js': '^2.38.0',
        cors: '^2.8.5',
        dotenv: '^16.3.1',
      },
    }, null, 2)
  );

  // Create basic files
  await createWebFiles(projectDir, config);
  await createAPIFiles(projectDir, config);
  await createConfigFiles(projectDir, config);
  await createTestFiles(projectDir, config);
  await createDocFiles(projectDir, config);
  await createClaudeCodeHooks(projectDir, config);
}

async function createWebFiles(projectDir, config) {
  // Create vite.config.js
  await fs.writeFile(
    join(projectDir, 'apps/web/vite.config.js'),
    `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
  },
})
`
  );

  // Create index.html
  await fs.writeFile(
    join(projectDir, 'apps/web/index.html'),
    `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${config.projectName}</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
`
  );

  // Create main.jsx
  await fs.writeFile(
    join(projectDir, 'apps/web/src/main.jsx'),
    `import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
`
  );

  // Create App.jsx
  await fs.writeFile(
    join(projectDir, 'apps/web/src/App.jsx'),
    `import React from 'react'

function App() {
  return (
    <div>
      <h1>${config.projectName}</h1>
      <p>Welcome to your new PERN stack app!</p>
    </div>
  )
}

export default App
`
  );
}

async function createAPIFiles(projectDir, config) {
  // Create index.js
  await fs.writeFile(
    join(projectDir, 'apps/api/src/index.js'),
    `import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 4000

app.use(cors())
app.use(express.json())

app.get('/health', (req, res) => {
  res.json({ status: 'ok' })
})

app.listen(PORT, () => {
  console.log(\`API server running on port \${PORT}\`)
})
`
  );
}

async function createConfigFiles(projectDir, config) {
  // Create .env.example
  await fs.writeFile(
    join(projectDir, '.env.example'),
    `# Supabase
SUPABASE_URL=
SUPABASE_ANON_KEY=

# API
PORT=4000
`
  );

  // Create .gitignore
  await fs.writeFile(
    join(projectDir, '.gitignore'),
    `node_modules/
dist/
.env
.env.local
*.log
.DS_Store
.dovetail/state.json
test-results/
playwright-report/
`
  );

  // Create fly.toml for staging
  await fs.writeFile(
    join(projectDir, 'fly.staging.toml'),
    `app = "${config.slug}-staging"
primary_region = "${config.region}"

[build]

[http_service]
  internal_port = 4000
  force_https = true
  auto_stop_machines = true
  auto_start_machines = true
  min_machines_running = 0
`
  );

  // Create fly.toml for production
  await fs.writeFile(
    join(projectDir, 'fly.production.toml'),
    `app = "${config.slug}-production"
primary_region = "${config.region}"

[build]

[http_service]
  internal_port = 4000
  force_https = true
  auto_stop_machines = true
  auto_start_machines = true
  min_machines_running = 1
`
  );
}

async function createTestFiles(projectDir, config) {
  // Create playwright.config.js
  await fs.writeFile(
    join(projectDir, 'playwright.config.js'),
    `import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
})
`
  );

  // Create sample test
  await fs.writeFile(
    join(projectDir, 'tests/example.spec.js'),
    `import { test, expect } from '@playwright/test'

test('homepage loads', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('h1')).toContainText('${config.projectName}')
})
`
  );
}

async function createDocFiles(projectDir, config) {
  // Create README.md
  await fs.writeFile(
    join(projectDir, 'README.md'),
    `# ${config.projectName}

A PERN stack application generated with Dovetail.

## Getting Started

\`\`\`bash
npm install
npm run dev
\`\`\`

## Development Workflow

\`\`\`bash
dovetail start           # Start working on an issue
dovetail commit          # Commit changes with checks
dovetail test            # Run tests
dovetail ready           # Check if ready to merge
dovetail merge           # Merge to main
dovetail deploy staging  # Deploy to staging
\`\`\`

## Project Structure

\`\`\`
├── apps/
│   ├── web/          # React frontend
│   └── api/          # Express backend
├── migrations/       # Database migrations
├── tests/            # Playwright tests
└── docs/             # Documentation
\`\`\`

## Resources

- **GitHub**: ${config.slug}
- **Linear**: [Project Board]
- **Supabase**: [Dashboard]
- **Staging**: https://${config.slug}-staging.fly.dev
- **Production**: https://${config.slug}-production.fly.dev
`
  );

  // Create API docs
  await fs.writeFile(
    join(projectDir, 'docs/api.md'),
    `# API Documentation

## Endpoints

### GET /health

Health check endpoint.

**Response:**
\`\`\`json
{
  "status": "ok"
}
\`\`\`
`
  );
}

async function createClaudeCodeHooks(projectDir, config) {
  // Path to hook templates in dovetail installation
  const hooksTemplateDir = join(__dirname, '../../.claude-hooks');

  // Copy all hook scripts
  const hookFiles = [
    'session-start.sh',
    'user-prompt-submit.sh',
    'pre-tool-use.sh',
    'post-tool-use.sh',
    'agent-complete.sh'
  ];

  for (const hookFile of hookFiles) {
    try {
      const sourcePath = join(hooksTemplateDir, hookFile);
      const destPath = join(projectDir, '.claude/hooks', hookFile);

      const content = await fs.readFile(sourcePath, 'utf-8');
      await fs.writeFile(destPath, content, { mode: 0o755 });
    } catch (error) {
      // Hook files are optional - if they don't exist, skip them
      console.log(`Skipping hook ${hookFile}: ${error.message}`);
    }
  }

  // Create Claude Code hooks configuration
  await fs.writeFile(
    join(projectDir, '.claude/settings.json'),
    JSON.stringify({
      hooks: {
        SessionStart: [
          {
            hooks: [
              {
                type: 'command',
                command: 'bash "$CLAUDE_PROJECT_DIR"/.claude/hooks/session-start.sh'
              }
            ]
          }
        ],
        UserPromptSubmit: [
          {
            hooks: [
              {
                type: 'command',
                command: 'bash "$CLAUDE_PROJECT_DIR"/.claude/hooks/user-prompt-submit.sh'
              }
            ]
          }
        ],
        PreToolUse: [
          {
            matcher: 'Write|Edit',
            hooks: [
              {
                type: 'command',
                command: 'bash "$CLAUDE_PROJECT_DIR"/.claude/hooks/pre-tool-use.sh'
              }
            ]
          }
        ],
        PostToolUse: [
          {
            matcher: 'Write|Edit',
            hooks: [
              {
                type: 'command',
                command: 'bash "$CLAUDE_PROJECT_DIR"/.claude/hooks/post-tool-use.sh'
              }
            ]
          }
        ]
      }
    }, null, 2)
  );

  // Create Dovetail configuration
  await fs.writeFile(
    join(projectDir, '.claude/config.json'),
    JSON.stringify({
      dovetail: {
        enforcement: 'strict',
        autoCommit: false,
        autoMerge: false,
        autoDeploy: {
          staging: true,
          production: false
        },
        requireConfirmation: {
          merge: true,
          deployProduction: true
        }
      }
    }, null, 2)
  );

  // Add README for Claude Code integration
  await fs.writeFile(
    join(projectDir, '.claude/README.md'),
    `# Claude Code Integration

This project is configured to work with Claude Code (claude.ai/code).

## Dovetail Workflow Enforcement

The hooks in this directory automatically enforce the Dovetail workflow:

### What the Hooks Do

1. **session-start.sh** - Shows project context when Claude Code opens
2. **user-prompt-submit.sh** - Injects workflow requirements before every message
3. **pre-tool-use.sh** - Blocks file operations if workflow requirements not met
4. **post-tool-use.sh** - Suggests commits after significant work
5. **agent-complete.sh** - Shows next workflow step after task completion

### Workflow Enforcement

The hooks enforce this workflow automatically:

1. **Issue Selection** - Must have a Linear issue before coding
2. **Branch Creation** - Must be on feature branch (not main)
3. **Code Changes** - Can write code when requirements met
4. **Commit** - Must commit before continuing (runs checks, creates PR)
5. **Deploy** - Automatically deploys to staging after commit
6. **Merge** - Requires testing confirmation, runs quality gate
7. **Production** - Requires explicit confirmation

### Commands Available

- \`dovetail status\` - Show project state
- \`dovetail start <issue-key>\` - Start work on issue
- \`dovetail commit\` - Smart commit with checks
- \`dovetail merge\` - Merge to main
- \`dovetail deploy <env>\` - Deploy to staging/production

Claude Code will automatically use these commands based on context.

### Configuration

Edit \`.claude/config.json\` to customize:
- Auto-deployment settings
- Confirmation requirements
- Enforcement level

### Disable Hooks

To disable hooks temporarily:
\`\`\`bash
mv .claude/hooks .claude/hooks.disabled
\`\`\`

To re-enable:
\`\`\`bash
mv .claude/hooks.disabled .claude/hooks
\`\`\`
`
  );
}
