import axios from 'axios';

export interface GitHubDeployment {
  status: 'pending' | 'success' | 'error' | 'in_progress';
  message: string;
  timestamp: string;
  commit?: string;
  branch?: string;
}

class GitHubAPI {
  private token: string;
  private owner: string;
  private repo: string;

  constructor() {
    this.token = import.meta.env.VITE_GITHUB_TOKEN || '';
    this.owner = import.meta.env.VITE_GITHUB_OWNER || '';
    this.repo = import.meta.env.VITE_GITHUB_REPO || '';
  }

  // Trigger deployment via direct server call
  async triggerDeployment(): Promise<GitHubDeployment> {
    try {
      // Check if required environment variables are set
      if (!this.token || !this.owner || !this.repo) {
        return {
          status: 'error',
          message: 'GitHub integration not configured. Please set:\n• VITE_GITHUB_TOKEN (your GitHub personal access token)\n• VITE_GITHUB_OWNER (your GitHub username)\n• VITE_GITHUB_REPO (repository name)',
          timestamp: new Date().toISOString()
        };
      }

      // Try direct server deployment first (if available)
      console.log('🚀 Attempting direct server deployment...');
      console.log(`Repository: ${this.owner}/${this.repo}`);
      
      // Try to call the deployment script directly on the server
      try {
        const serverResponse = await axios.post('/api/deploy', {
          timestamp: new Date().toISOString(),
          triggered_by: 'enhanced-health-tracker-app'
        }, {
          timeout: 30000
        });
        
        return {
          status: 'success',
          message: 'Deployment triggered successfully on j.ringing.org.uk server.',
          timestamp: new Date().toISOString()
        };
      } catch (serverError: any) {
        console.log('Direct server deployment not available, trying GitHub API...');
        
        // Fallback to GitHub API approach
        const response = await axios.post(
          `https://api.github.com/repos/${this.owner}/${this.repo}/dispatches`,
          {
            event_type: 'deploy',
            client_payload: {
              environment: 'production',
              timestamp: new Date().toISOString(),
              triggered_by: 'enhanced-health-tracker-app',
              target_domain: 'j.ringing.org.uk'
            }
          },
          {
            headers: {
              'Authorization': `token ${this.token}`,
              'Accept': 'application/vnd.github.v3+json',
              'Content-Type': 'application/json',
              'User-Agent': 'Enhanced-Health-Tracker-App'
            },
            timeout: 15000
          }
        );
      }

      console.log('✅ GitHub repository dispatch sent successfully');
      
      return {
        status: 'success',
        message: 'Deployment request sent to j.ringing.org.uk. The server should begin deployment shortly. Check server logs with: sudo tail -f /var/log/health-tracker-deploy.log',
        timestamp: new Date().toISOString()
      };
    } catch (error: any) {
      console.error('GitHub deployment error:', error);
      
      let errorMessage = 'Failed to trigger deployment';
      if (error.response?.status === 401) {
        errorMessage = 'Invalid GitHub token. Please check your VITE_GITHUB_TOKEN has "repo" permissions.';
      } else if (error.response?.status === 404) {
        errorMessage = `Repository "${this.owner}/${this.repo}" not found. Please check VITE_GITHUB_OWNER and VITE_GITHUB_REPO.`;
      } else if (error.code === 'ECONNABORTED') {
        errorMessage = 'Request timeout. Please check your network connection.';
      } else if (error.response?.status === 422) {
        errorMessage = 'Repository dispatch failed. Try running the deployment manually on your server: sudo /var/www/health-tracker/deploy.sh';
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      
      return {
        status: 'error',
        message: errorMessage,
        timestamp: new Date().toISOString()
      };
    }
  }

  // Get latest commit info
  async getLatestCommit(): Promise<{ sha: string; message: string; author: string; date: string } | null> {
    try {
      // Check if required environment variables are set
      if (!this.token || !this.owner || !this.repo) {
        return null;
      }

      const response = await axios.get(
        `https://api.github.com/repos/${this.owner}/${this.repo}/commits/main`,
        {
          headers: {
            'Authorization': `token ${this.token}`,
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'Enhanced-Health-Tracker-App'
          },
          timeout: 10000
        }
      );

      const commit = response.data;
      return {
        sha: commit.sha.substring(0, 7),
        message: commit.commit.message,
        author: commit.commit.author.name,
        date: commit.commit.author.date
      };
    } catch (error) {
      // Silently handle authentication errors - GitHub integration is optional
      if (error.response?.status === 401) {
        console.log('GitHub token not configured or invalid - skipping latest commit fetch');
      } else {
        console.error('Error fetching latest commit:', error);
      }
      return null;
    }
  }

  // Check deployment status (if using GitHub Actions)
  async getDeploymentStatus(): Promise<GitHubDeployment | null> {
    try {
      // Check if required environment variables are set
      if (!this.token || !this.owner || !this.repo) {
        return null;
      }

      const response = await axios.get(
        `https://api.github.com/repos/${this.owner}/${this.repo}/actions/runs?per_page=1`,
        {
          headers: {
            'Authorization': `token ${this.token}`,
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'Enhanced-Health-Tracker-App'
          },
          timeout: 10000
        }
      );

      const runs = response.data.workflow_runs;
      if (runs && runs.length > 0) {
        const latestRun = runs[0];
        return {
          status: latestRun.status === 'completed' 
            ? (latestRun.conclusion === 'success' ? 'success' : 'error')
            : 'in_progress',
          message: `Workflow: ${latestRun.name}`,
          timestamp: latestRun.updated_at,
          commit: latestRun.head_sha.substring(0, 7),
          branch: latestRun.head_branch
        };
      }
      return null;
    } catch (error) {
      // Silently handle authentication errors - GitHub integration is optional
      if (error.response?.status === 401) {
        console.log('GitHub token not configured or invalid - skipping deployment status');
      } else {
        console.error('Error fetching deployment status:', error);
      }
      return null;
    }
  }
}

export const githubAPI = new GitHubAPI();