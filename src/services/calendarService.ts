import { getAccessToken, AuthExpiredError, clearCachedAccessToken } from './auth';

async function getAuthHeader(): Promise<Record<string, string>> {
  const token = await getAccessToken();
  if (!token) {
    throw new AuthExpiredError('Not authenticated. Please sign in with Google.');
  }
  return {
    Authorization: `Bearer ${token}`,
  };
}

async function calendarFetch(url: string, options: RequestInit = {}): Promise<Response> {
  try {
    const res = await fetch(url, options);
    if (res.status === 401) {
      clearCachedAccessToken();
      throw new AuthExpiredError();
    }
    return res;
  } catch (err: any) {
    if (err instanceof AuthExpiredError || err.name === 'AuthExpiredError') throw err;
    if (err?.name === 'TypeError' || err?.message === 'Load failed' || err?.message === 'Failed to fetch') {
      throw new Error('Network issue while communicating with Google Calendar.');
    }
    throw err;
  }
}

export interface CalendarEventPayload {
  topicName: string;
  subjectName: string;
  topicId: string;
  revisionDate: string; // YYYY-MM-DD
  reminderTime: string; // HH:mm
  revisionCount: number;
  notes?: string;
  driveFolderLink?: string;
}

export async function createOrUpdateRevisionCalendarEvent(
  existingEventId: string | undefined,
  payload: CalendarEventPayload
): Promise<string> {
  const headers = await getAuthHeader();

  const [hours, minutes] = payload.reminderTime.split(':').map(Number);
  const startDate = new Date(payload.revisionDate);
  startDate.setHours(hours || 9, minutes || 0, 0, 0);

  const endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // 1 hour session

  const eventBody = {
    summary: `📚 Revision: ${payload.topicName} (${payload.subjectName})`,
    description: `Time for your revision session for **${payload.topicName}** in **${payload.subjectName}**.\n\nRevision Round: #${payload.revisionCount + 1}\n${payload.notes ? `\nStudy Notes:\n${payload.notes}` : ''}\n\nOrganized in ReviseDrive.`,
    start: {
      dateTime: startDate.toISOString(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
    end: {
      dateTime: endDate.toISOString(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'popup', minutes: 30 },
        { method: 'popup', minutes: 10 },
      ],
    },
    colorId: '9', // Blueberry / Blue
  };

  if (existingEventId) {
    // Try to update existing event
    const updateRes = await calendarFetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${existingEventId}`,
      {
        method: 'PATCH',
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(eventBody),
      }
    );

    if (updateRes.ok) {
      const data = await updateRes.json();
      return data.id;
    }
    // If not found or failed, fall through to create new event
  }

  const createRes = await calendarFetch(
    'https://www.googleapis.com/calendar/v3/calendars/primary/events',
    {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(eventBody),
    }
  );

  if (!createRes.ok) {
    throw new Error(`Failed to create calendar event: ${await createRes.text()}`);
  }

  const created = await createRes.json();
  return created.id;
}

export async function deleteCalendarEvent(eventId: string): Promise<void> {
  const headers = await getAuthHeader();
  const res = await calendarFetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
    {
      method: 'DELETE',
      headers,
    }
  );

  if (!res.ok && res.status !== 404 && res.status !== 410) {
    throw new Error(`Failed to delete calendar event: ${await res.text()}`);
  }
}
