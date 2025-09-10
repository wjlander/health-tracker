interface AlexaReminder {
  trigger: {
    type: 'SCHEDULED_ABSOLUTE' | 'SCHEDULED_RELATIVE';
    scheduledTime?: string;
    offsetInSeconds?: number;
    timeZoneId?: string;
  };
  alertInfo: {
    spokenInfo: {
      content: Array<{
        locale: string;
        text: string;
      }>;
    };
  };
  pushNotification: {
    status: 'ENABLED' | 'DISABLED';
  };
}

interface AlexaConfig {
  skillId: string;
  clientId: string;
  clientSecret: string;
}

class AlexaIntegrationAPI {
  private accessToken: string | null = null;
  private config: AlexaConfig | null = null;
  private baseUrl = 'https://api.amazonalexa.com';

  constructor() {
    this.loadConfig();
  }

  // Load configuration from localStorage
  private loadConfig(): boolean {
    try {
      const savedConfig = localStorage.getItem('api_configuration');
      if (!savedConfig) {
        console.error('No API configuration found');
        return false;
      }

      const config = JSON.parse(savedConfig);
      if (!config.alexa_skill_id || !config.alexa_client_id || !config.alexa_client_secret) {
        console.error('Alexa configuration missing');
        return false;
      }

      this.config = {
        skillId: config.alexa_skill_id,
        clientId: config.alexa_client_id,
        clientSecret: config.alexa_client_secret
      };

      console.log('✅ Alexa configuration loaded');
      return true;
    } catch (error) {
      console.error('❌ Failed to load Alexa configuration:', error);
      return false;
    }
  }

  // Authenticate with Alexa (would typically be done through OAuth flow)
  async authenticate(accessToken: string): Promise<boolean> {
    if (!this.config) {
      console.error('Alexa not configured');
      return false;
    }

    try {
      this.accessToken = accessToken;
      console.log('✅ Alexa authenticated');
      return true;
    } catch (error) {
      console.error('❌ Alexa authentication failed:', error);
      return false;
    }
  }

  // Create a health reminder
  async createHealthReminder(reminderData: {
    title: string;
    scheduledTime: string;
    timeZone?: string;
    locale?: string;
  }): Promise<string | null> {
    if (!this.accessToken || !this.config) {
      console.error('Alexa not authenticated or configured');
      return null;
    }

    try {
      const reminder: AlexaReminder = {
        trigger: {
          type: 'SCHEDULED_ABSOLUTE',
          scheduledTime: reminderData.scheduledTime,
          timeZoneId: reminderData.timeZone || 'America/New_York'
        },
        alertInfo: {
          spokenInfo: {
            content: [{
              locale: reminderData.locale || 'en-US',
              text: `Health reminder: ${reminderData.title}`
            }]
          }
        },
        pushNotification: {
          status: 'ENABLED'
        }
      };

      const response = await fetch(`${this.baseUrl}/v1/alerts/reminders`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(reminder)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('✅ Alexa health reminder created:', result.alertToken);
      return result.alertToken;
    } catch (error) {
      console.error('❌ Failed to create Alexa health reminder:', error);
      return null;
    }
  }

  // Create medication reminder
  async createMedicationReminder(medicationData: {
    medicationName: string;
    dosage: string;
    scheduledTime: string;
    timeZone?: string;
    locale?: string;
  }): Promise<string | null> {
    const reminderText = `Time to take your ${medicationData.medicationName}. Your dosage is ${medicationData.dosage}.`;
    
    return await this.createHealthReminder({
      title: reminderText,
      scheduledTime: medicationData.scheduledTime,
      timeZone: medicationData.timeZone,
      locale: medicationData.locale
    });
  }

  // Create appointment reminder
  async createAppointmentReminder(appointmentData: {
    appointmentType: string;
    scheduledTime: string;
    location?: string;
    timeZone?: string;
    locale?: string;
  }): Promise<string | null> {
    let reminderText = `You have a ${appointmentData.appointmentType} appointment`;
    if (appointmentData.location) {
      reminderText += ` at ${appointmentData.location}`;
    }
    reminderText += '.';

    return await this.createHealthReminder({
      title: reminderText,
      scheduledTime: appointmentData.scheduledTime,
      timeZone: appointmentData.timeZone,
      locale: appointmentData.locale
    });
  }

  // Create daily health check reminder
  async createDailyHealthCheckReminder(checkData: {
    checkType: string;
    dailyTime: string; // e.g., "08:00:00"
    timeZone?: string;
    locale?: string;
  }): Promise<string | null> {
    // Create a recurring reminder for daily health checks
    const today = new Date();
    const [hours, minutes, seconds] = checkData.dailyTime.split(':').map(Number);
    
    // Set time for today
    const scheduledDate = new Date(today);
    scheduledDate.setHours(hours, minutes, seconds || 0, 0);
    
    // If the time has already passed today, schedule for tomorrow
    if (scheduledDate <= today) {
      scheduledDate.setDate(scheduledDate.getDate() + 1);
    }

    const reminderText = `Time for your daily ${checkData.checkType} check. Don't forget to log your health data.`;

    return await this.createHealthReminder({
      title: reminderText,
      scheduledTime: scheduledDate.toISOString(),
      timeZone: checkData.timeZone,
      locale: checkData.locale
    });
  }

  // Get all reminders
  async getReminders(): Promise<any[]> {
    if (!this.accessToken) {
      console.error('Alexa not authenticated');
      return [];
    }

    try {
      const response = await fetch(`${this.baseUrl}/v1/alerts/reminders`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      return result.alerts || [];
    } catch (error) {
      console.error('❌ Failed to get Alexa reminders:', error);
      return [];
    }
  }

  // Delete a reminder
  async deleteReminder(alertToken: string): Promise<boolean> {
    if (!this.accessToken) {
      console.error('Alexa not authenticated');
      return false;
    }

    try {
      const response = await fetch(`${this.baseUrl}/v1/alerts/reminders/${alertToken}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      console.log('✅ Alexa reminder deleted:', alertToken);
      return true;
    } catch (error) {
      console.error('❌ Failed to delete Alexa reminder:', error);
      return false;
    }
  }

  // Trigger a custom routine (requires Custom Triggers API - Developer Preview)
  async triggerHealthRoutine(routineData: {
    routineName: string;
    payload?: any;
  }): Promise<boolean> {
    if (!this.accessToken || !this.config) {
      console.error('Alexa not authenticated or configured');
      return false;
    }

    try {
      const response = await fetch(`${this.baseUrl}/v1/routines/triggerInstances`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          skillId: this.config.skillId,
          stage: 'development', // or 'live'
          payload: routineData.payload || {}
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      console.log('✅ Alexa routine triggered:', routineData.routineName);
      return true;
    } catch (error) {
      console.error('❌ Failed to trigger Alexa routine:', error);
      return false;
    }
  }

  // Get authentication URL for Login with Amazon (LWA)
  getAuthUrl(redirectUri: string): string {
    if (!this.config) {
      throw new Error('Alexa not configured');
    }

    const params = new URLSearchParams({
      client_id: this.config.clientId,
      scope: 'alexa::alerts:reminders:skill:readwrite',
      response_type: 'code',
      redirect_uri: redirectUri
    });

    return `https://www.amazon.com/ap/oa?${params.toString()}`;
  }

  // Exchange authorization code for access token
  async exchangeCodeForToken(code: string, redirectUri: string): Promise<string | null> {
    if (!this.config) {
      console.error('Alexa not configured');
      return null;
    }

    try {
      const response = await fetch('https://api.amazon.com/auth/o2/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code: code,
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret,
          redirect_uri: redirectUri
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      this.accessToken = result.access_token;
      
      // Store token securely (in a real app, use secure storage)
      localStorage.setItem('alexa_access_token', result.access_token);
      
      console.log('✅ Alexa access token obtained');
      return result.access_token;
    } catch (error) {
      console.error('❌ Failed to exchange code for token:', error);
      return null;
    }
  }

  // Check if authenticated
  isAuthenticated(): boolean {
    return !!this.accessToken;
  }

  // Sign out
  signOut(): void {
    this.accessToken = null;
    localStorage.removeItem('alexa_access_token');
    console.log('📴 Alexa signed out');
  }
}

// Create and export singleton instance
export const alexaIntegration = new AlexaIntegrationAPI();

// Helper functions for common health reminders
export const scheduleVitaminReminder = async (vitaminName: string, dailyTime: string) => {
  return await alexaIntegration.createMedicationReminder({
    medicationName: vitaminName,
    dosage: 'your daily dose',
    scheduledTime: dailyTime
  });
};

export const scheduleBloodPressureCheck = async (dailyTime: string) => {
  return await alexaIntegration.createDailyHealthCheckReminder({
    checkType: 'blood pressure',
    dailyTime: dailyTime
  });
};

export const scheduleWeightCheck = async (dailyTime: string) => {
  return await alexaIntegration.createDailyHealthCheckReminder({
    checkType: 'weight',
    dailyTime: dailyTime
  });
};

export const scheduleMoodTracking = async (dailyTime: string) => {
  return await alexaIntegration.createDailyHealthCheckReminder({
    checkType: 'mood',
    dailyTime: dailyTime
  });
};