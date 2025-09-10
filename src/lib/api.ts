// API client to replace Supabase calls with server-side API calls

const API_BASE = '/api';

// Helper function for API requests
async function apiRequest(endpoint: string, options: RequestInit = {}) {
  const url = `${API_BASE}${endpoint}`;
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Unknown error' }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  return response.json();
}

// Health Entries API
export const healthAPI = {
  async getEntries(userId: string, limit = 30) {
    return apiRequest(`/health-entries/${userId}?limit=${limit}`);
  },

  async createEntry(entry: any) {
    return apiRequest('/health-entries', {
      method: 'POST',
      body: JSON.stringify(entry),
    });
  },

  async getEntry(id: string) {
    return apiRequest(`/health-entries/entry/${id}`);
  },

  async updateEntry(id: string, entry: any) {
    return apiRequest(`/health-entries/${id}`, {
      method: 'PUT',
      body: JSON.stringify(entry),
    });
  },

  async deleteEntry(id: string) {
    return apiRequest(`/health-entries/${id}`, {
      method: 'DELETE',
    });
  },
};

// Food Entries API
export const foodAPI = {
  async getEntries(userId: string, limit = 50) {
    return apiRequest(`/food-entries/${userId}?limit=${limit}`);
  },

  async createEntry(entry: any) {
    return apiRequest('/food-entries', {
      method: 'POST',
      body: JSON.stringify(entry),
    });
  },

  async deleteEntry(id: string) {
    return apiRequest(`/food-entries/${id}`, {
      method: 'DELETE',
    });
  },
};

// Activity Entries API
export const activityAPI = {
  async getEntries(userId: string, limit = 50) {
    return apiRequest(`/activity-entries/${userId}?limit=${limit}`);
  },

  async createEntry(entry: any) {
    return apiRequest('/activity-entries', {
      method: 'POST',
      body: JSON.stringify(entry),
    });
  },

  async deleteEntry(id: string) {
    return apiRequest(`/activity-entries/${id}`, {
      method: 'DELETE',
    });
  },
};

// User API
export const userAPI = {
  async getUser(id: string) {
    return apiRequest(`/users/${id}`);
  },

  async createUser(user: any) {
    return apiRequest('/users', {
      method: 'POST',
      body: JSON.stringify(user),
    });
  },
};

// Integrations API
export const integrationsAPI = {
  async getIntegration(userId: string, provider: string) {
    return apiRequest(`/integrations/${userId}/${provider}`);
  },

  async saveIntegration(integration: any) {
    return apiRequest('/integrations', {
      method: 'POST',
      body: JSON.stringify(integration),
    });
  },

  async updateIntegration(id: string, data: any) {
    return apiRequest(`/integrations/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
};

// Fitbit API
export const fitbitAPI = {
  async saveActivities(data: any) {
    return apiRequest('/fitbit/activities', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async saveWeights(data: any) {
    return apiRequest('/fitbit/weights', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async saveFoods(data: any) {
    return apiRequest('/fitbit/foods', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async saveSleep(data: any) {
    return apiRequest('/fitbit/sleep', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};