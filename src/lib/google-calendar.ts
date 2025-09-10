import ApiCalendar from 'react-google-calendar-api';

interface CalendarEvent {
  id?: string;
  summary: string;
  description?: string;
  location?: string;
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
  reminders?: {
    useDefault: boolean;
    overrides?: Array<{
      method: 'email' | 'popup';
      minutes: number;
    }>;
  };
  attendees?: Array<{
    email: string;
  }>;
}

interface CalendarConfig {
  clientId: string;
  apiKey: string;
  scope: string;
  discoveryDocs: string[];
}

class GoogleCalendarAPI {
  private apiCalendar: any;
  private isInitialized = false;
  private isSignedIn = false;

  constructor() {
    this.apiCalendar = null;
  }

  // Initialize the Google Calendar API
  async initialize(): Promise<boolean> {
    try {
      const savedConfig = localStorage.getItem('api_configuration');
      if (!savedConfig) {
        console.error('No API configuration found');
        return false;
      }

      const config = JSON.parse(savedConfig);
      if (!config.google_client_id || !config.google_api_key) {
        console.error('Google Calendar credentials missing');
        return false;
      }

      const calendarConfig: CalendarConfig = {
        clientId: config.google_client_id,
        apiKey: config.google_api_key,
        scope: 'https://www.googleapis.com/auth/calendar',
        discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest']
      };

      this.apiCalendar = new ApiCalendar(calendarConfig);
      this.isInitialized = true;
      
      // Check if already signed in
      try {
        this.isSignedIn = await this.apiCalendar.gapi.auth2.getAuthInstance().isSignedIn.get();
      } catch (error) {
        this.isSignedIn = false;
      }

      console.log('✅ Google Calendar API initialized');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize Google Calendar API:', error);
      return false;
    }
  }

  // Sign in to Google Calendar
  async signIn(): Promise<boolean> {
    if (!this.isInitialized) {
      const initialized = await this.initialize();
      if (!initialized) return false;
    }

    try {
      await this.apiCalendar.handleAuthClick();
      this.isSignedIn = true;
      console.log('✅ Google Calendar signed in successfully');
      return true;
    } catch (error) {
      console.error('❌ Google Calendar sign in failed:', error);
      return false;
    }
  }

  // Sign out from Google Calendar
  async signOut(): Promise<void> {
    if (this.apiCalendar) {
      await this.apiCalendar.handleSignoutClick();
      this.isSignedIn = false;
      console.log('📴 Google Calendar signed out');
    }
  }

  // Check if user is signed in
  getSignInStatus(): boolean {
    return this.isSignedIn;
  }

  // Create a health reminder event
  async createHealthReminder(reminderData: {
    title: string;
    description?: string;
    dateTime: string;
    duration?: number; // in minutes, default 15
    reminderMinutes?: number[]; // array of minutes before event for reminders
  }): Promise<string | null> {
    if (!this.isSignedIn) {
      console.error('Not signed in to Google Calendar');
      return null;
    }

    try {
      const startDateTime = new Date(reminderData.dateTime);
      const endDateTime = new Date(startDateTime.getTime() + (reminderData.duration || 15) * 60000);
      const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

      const event: CalendarEvent = {
        summary: `🩺 ${reminderData.title}`,
        description: reminderData.description || 'Health tracking reminder from your health app',
        start: {
          dateTime: startDateTime.toISOString(),
          timeZone: timeZone
        },
        end: {
          dateTime: endDateTime.toISOString(),
          timeZone: timeZone
        },
        reminders: {
          useDefault: false,
          overrides: (reminderData.reminderMinutes || [15]).map(minutes => ({
            method: 'popup' as const,
            minutes: minutes
          }))
        }
      };

      const response = await this.apiCalendar.createEvent(event);
      console.log('✅ Health reminder created:', response.result.id);
      return response.result.id;
    } catch (error) {
      console.error('❌ Failed to create health reminder:', error);
      return null;
    }
  }

  // Create a medication reminder
  async createMedicationReminder(medicationData: {
    medicationName: string;
    dosage: string;
    times: string[]; // array of time strings like "08:00", "14:00", "20:00"
    startDate: string;
    endDate?: string;
  }): Promise<string[]> {
    if (!this.isSignedIn) {
      console.error('Not signed in to Google Calendar');
      return [];
    }

    const eventIds: string[] = [];
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    try {
      for (const time of medicationData.times) {
        const [hours, minutes] = time.split(':').map(Number);
        const startDate = new Date(medicationData.startDate);
        startDate.setHours(hours, minutes, 0, 0);

        const endDate = new Date(startDate.getTime() + 15 * 60000); // 15 minutes duration

        const event: CalendarEvent = {
          summary: `💊 ${medicationData.medicationName}`,
          description: `Take ${medicationData.dosage} of ${medicationData.medicationName}`,
          start: {
            dateTime: startDate.toISOString(),
            timeZone: timeZone
          },
          end: {
            dateTime: endDate.toISOString(),
            timeZone: timeZone
          },
          reminders: {
            useDefault: false,
            overrides: [
              { method: 'popup', minutes: 0 }, // At time of event
              { method: 'popup', minutes: 5 }  // 5 minutes before
            ]
          }
        };

        // If this is a recurring medication, create recurring event
        if (medicationData.endDate) {
          (event as any).recurrence = [
            `RRULE:FREQ=DAILY;UNTIL=${new Date(medicationData.endDate).toISOString().split('T')[0].replace(/-/g, '')}`
          ];
        }

        const response = await this.apiCalendar.createEvent(event);
        eventIds.push(response.result.id);
      }

      console.log('✅ Medication reminders created:', eventIds.length);
      return eventIds;
    } catch (error) {
      console.error('❌ Failed to create medication reminders:', error);
      return [];
    }
  }

  // Get upcoming health events
  async getUpcomingHealthEvents(days: number = 7): Promise<CalendarEvent[]> {
    if (!this.isSignedIn) {
      console.error('Not signed in to Google Calendar');
      return [];
    }

    try {
      const timeMin = new Date().toISOString();
      const timeMax = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

      const response = await this.apiCalendar.listEvents({
        timeMin,
        timeMax,
        singleEvents: true,
        orderBy: 'startTime',
        q: '🩺 OR 💊' // Search for health or medication events
      });

      return response.result.items || [];
    } catch (error) {
      console.error('❌ Failed to fetch health events:', error);
      return [];
    }
  }

  // Delete an event
  async deleteEvent(eventId: string): Promise<boolean> {
    if (!this.isSignedIn) {
      console.error('Not signed in to Google Calendar');
      return false;
    }

    try {
      await this.apiCalendar.deleteEvent(eventId);
      console.log('✅ Event deleted:', eventId);
      return true;
    } catch (error) {
      console.error('❌ Failed to delete event:', error);
      return false;
    }
  }

  // Create appointment reminder
  async createAppointmentReminder(appointmentData: {
    title: string;
    description?: string;
    location?: string;
    dateTime: string;
    duration: number; // in minutes
    doctorEmail?: string;
  }): Promise<string | null> {
    if (!this.isSignedIn) {
      console.error('Not signed in to Google Calendar');
      return null;
    }

    try {
      const startDateTime = new Date(appointmentData.dateTime);
      const endDateTime = new Date(startDateTime.getTime() + appointmentData.duration * 60000);
      const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

      const event: CalendarEvent = {
        summary: `🏥 ${appointmentData.title}`,
        description: appointmentData.description,
        location: appointmentData.location,
        start: {
          dateTime: startDateTime.toISOString(),
          timeZone: timeZone
        },
        end: {
          dateTime: endDateTime.toISOString(),
          timeZone: timeZone
        },
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'email', minutes: 24 * 60 }, // 1 day before
            { method: 'popup', minutes: 60 },      // 1 hour before
            { method: 'popup', minutes: 15 }       // 15 minutes before
          ]
        }
      };

      if (appointmentData.doctorEmail) {
        event.attendees = [{ email: appointmentData.doctorEmail }];
      }

      const response = await this.apiCalendar.createEvent(event);
      console.log('✅ Appointment reminder created:', response.result.id);
      return response.result.id;
    } catch (error) {
      console.error('❌ Failed to create appointment reminder:', error);
      return null;
    }
  }
}

// Create and export a singleton instance
export const googleCalendar = new GoogleCalendarAPI();

// Helper functions for common use cases
export const createMedicationSchedule = async (
  medicationName: string,
  dosage: string,
  times: string[],
  startDate: string,
  endDate?: string
) => {
  return await googleCalendar.createMedicationReminder({
    medicationName,
    dosage,
    times,
    startDate,
    endDate
  });
};

export const scheduleDoctorAppointment = async (
  title: string,
  dateTime: string,
  duration: number,
  location?: string,
  doctorEmail?: string,
  description?: string
) => {
  return await googleCalendar.createAppointmentReminder({
    title,
    dateTime,
    duration,
    location,
    doctorEmail,
    description
  });
};

export const createHealthCheckReminder = async (
  checkType: string,
  dateTime: string,
  reminderMinutes: number[] = [60, 15]
) => {
  return await googleCalendar.createHealthReminder({
    title: `${checkType} Check`,
    description: `Time for your ${checkType.toLowerCase()} health check`,
    dateTime,
    reminderMinutes
  });
};