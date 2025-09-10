import React, { useState, useEffect } from 'react';
import { GitBranch, RefreshCw, CheckCircle, AlertCircle, Clock, ExternalLink } from 'lucide-react';
import { githubAPI, GitHubDeployment } from '../lib/github';

export const GitHubUpdate: React.FC = () => {
  const [isDeploying, setIsDeploying] = useState(false);
  const [deploymentStatus, setDeploymentStatus] = useState<GitHubDeployment | null>(null);
  const [latestCommit, setLatestCommit] = useState<any>(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    fetchLatestCommit();
    fetchDeploymentStatus();
  }, []);

  const fetchLatestCommit = async () => {
    try {
      const commit = await githubAPI.getLatestCommit();
      if (commit) {
        setLatestCommit(commit);
      }
    } catch (error) {
      // GitHub integration is optional - don't log errors
      console.log('GitHub commit info unavailable');
    }
  };

  const fetchDeploymentStatus = async () => {
    try {
      const status = await githubAPI.getDeploymentStatus();
      if (status) {
        setDeploymentStatus(status);
      }
    } catch (error) {
      // Silently handle GitHub API errors - deployment status is optional
      console.log('GitHub deployment status unavailable');
    }
  };

  const triggerUpdate = async () => {
    setIsDeploying(true);
    
    try {
      const result = await githubAPI.triggerDeployment();
      setDeploymentStatus(result);
      
      // Always stop deploying state after getting result
      setIsDeploying(false);
    } catch (error) {
      console.error('Deployment error:', error);
      setDeploymentStatus({
        status: 'error',
        message: 'Failed to trigger deployment',
        timestamp: new Date().toISOString()
      });
      setIsDeploying(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-600" />;
      case 'in_progress':
      case 'pending':
        return <RefreshCw className="h-5 w-5 text-blue-600 animate-spin" />;
      default:
        return <Clock className="h-5 w-5 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'error':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'in_progress':
      case 'pending':
        return 'bg-blue-50 border-blue-200 text-blue-800';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 border border-blue-100">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="bg-gray-800 p-2 rounded-lg">
            <GitBranch className="h-6 w-6 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">GitHub Deployment</h3>
            <p className="text-sm text-gray-600">
              Update the application from the latest GitHub repository
            </p>
          </div>
        </div>
        
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="text-sm text-blue-600 hover:text-blue-700 transition-colors"
        >
          {showDetails ? 'Hide Details' : 'Show Details'}
        </button>
      </div>

      {/* Latest Commit Info */}
      {latestCommit && (
        <div className="mb-4 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900 mb-1">
                Latest Commit: {latestCommit.sha}
              </p>
              <p className="text-sm text-gray-600 mb-2">{latestCommit.message}</p>
              <div className="flex items-center space-x-4 text-xs text-gray-500">
                <span>By {latestCommit.author}</span>
                <span>{new Date(latestCommit.date).toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Deployment Status */}
      {deploymentStatus && (
        <div className={`mb-4 p-4 rounded-lg border ${getStatusColor(deploymentStatus.status)}`}>
          <div className="flex items-center space-x-3">
            {getStatusIcon(deploymentStatus.status)}
            <div className="flex-1">
              <p className="text-sm font-medium">
                {deploymentStatus.status === 'success' && 'Deployment Successful'}
                {deploymentStatus.status === 'error' && 'Deployment Failed'}
                {deploymentStatus.status === 'in_progress' && 'Deployment In Progress'}
                {deploymentStatus.status === 'pending' && 'Deployment Pending'}
              </p>
              <p className="text-xs mt-1">{deploymentStatus.message}</p>
              {deploymentStatus.timestamp && (
                <p className="text-xs mt-1">
                  {new Date(deploymentStatus.timestamp).toLocaleString()}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Deployment Button */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600">
          <p>Deploy the latest changes to your Ubuntu server</p>
          {showDetails && (
            <div className="mt-2 space-y-1 text-xs">
              <p>• Pulls latest code from main branch</p>
              <p>• Installs dependencies</p>
              <p>• Builds production version</p>
              <p>• Restarts application server</p>
            </div>
          )}
        </div>
        
        <button
          onClick={triggerUpdate}
          disabled={isDeploying}
          className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-colors ${
            isDeploying
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-gray-800 text-white hover:bg-gray-700'
          }`}
        >
          {isDeploying ? (
            <>
              <RefreshCw className="h-5 w-5 animate-spin" />
              <span>Deploying...</span>
            </>
          ) : (
            <>
              <GitBranch className="h-5 w-5" />
              <span>Deploy Update</span>
            </>
          )}
        </button>
      </div>

      {/* Warning Message */}
      <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
        <div className="flex items-start space-x-2">
          <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
          <div className="text-sm text-yellow-800">
            <p className="font-medium mb-1">Deployment Notes:</p>
            <ul className="text-xs space-y-1 list-disc list-inside">
              <li>The application will be briefly unavailable during deployment</li>
              <li>Ensure your server has the deploy.sh script configured</li>
              <li>Database migrations will run automatically if needed</li>
              <li>Check server logs if deployment fails</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Configuration Help */}
      {(!import.meta.env.VITE_GITHUB_TOKEN || !import.meta.env.VITE_GITHUB_OWNER) && (
        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start space-x-2">
            <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-2">🔧 GitHub Integration Setup:</p>
              <div className="space-y-2 text-xs">
                <p><strong>Step 1: Create GitHub Personal Access Token</strong></p>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li>Go to <a href="https://github.com/settings/tokens" target="_blank" className="text-blue-600 underline">GitHub Settings → Personal access tokens</a></li>
                  <li>Click "Generate new token (classic)"</li>
                  <li>Select scopes: <strong>repo</strong> (full control of private repositories)</li>
                  <li>Copy the token (starts with 'ghp_')</li>
                </ul>
                <p><strong>Step 2: Update .env file with these values:</strong></p>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li><code>VITE_GITHUB_TOKEN=ghp_your_token_here</code></li>
                  <li><code>VITE_GITHUB_OWNER=your_github_username</code></li>
                  <li><code>VITE_GITHUB_REPO=health-tracker</code></li>
                </ul>
                <p><strong>Step 3:</strong> Restart the dev server after updating .env</p>
                <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
                  <p className="text-yellow-800 font-medium">📝 Current Status:</p>
                  <ul className="text-yellow-700 text-xs mt-1">
                    <li>• Token: {import.meta.env.VITE_GITHUB_TOKEN ? '✅ Set' : '❌ Missing'}</li>
                    <li>• Owner: {import.meta.env.VITE_GITHUB_OWNER ? '✅ Set' : '❌ Missing'}</li>
                    <li>• Repo: {import.meta.env.VITE_GITHUB_REPO ? '✅ Set' : '❌ Missing'}</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* GitHub Repository Link */}
      {showDetails && import.meta.env.VITE_GITHUB_OWNER && import.meta.env.VITE_GITHUB_REPO && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <a
            href={`https://github.com/${import.meta.env.VITE_GITHUB_OWNER}/${import.meta.env.VITE_GITHUB_REPO}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center space-x-2 text-sm text-blue-600 hover:text-blue-700 transition-colors"
          >
            <ExternalLink className="h-4 w-4" />
            <span>View Repository on GitHub</span>
          </a>
        </div>
      )}
    </div>
  );
};