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

async function tasksFetch(url: string, options: RequestInit = {}): Promise<Response> {
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
      throw new Error('Network issue while communicating with Google Tasks.');
    }
    throw err;
  }
}

const STUDY_TASK_LIST_TITLE = 'Study Revisions (ReviseDrive)';

// Find or create dedicated task list
export async function getOrCreateTaskList(): Promise<string> {
  const headers = await getAuthHeader();
  const listRes = await tasksFetch('https://tasks.googleapis.com/tasks/v1/users/@me/lists', {
    headers,
  });

  if (!listRes.ok) {
    throw new Error(`Failed to fetch task lists: ${await listRes.text()}`);
  }

  const data = await listRes.json();
  const existing = (data.items || []).find(
    (item: any) => item.title === STUDY_TASK_LIST_TITLE
  );

  if (existing) {
    return existing.id;
  }

  // Create new task list
  const createRes = await tasksFetch('https://tasks.googleapis.com/tasks/v1/users/@me/lists', {
    method: 'POST',
    headers: {
      ...headers,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title: STUDY_TASK_LIST_TITLE,
    }),
  });

  if (!createRes.ok) {
    // If creation fails, fallback to default '@default'
    return '@default';
  }

  const created = await createRes.json();
  return created.id;
}

export interface TaskPayload {
  topicName: string;
  subjectName: string;
  revisionDate: string; // YYYY-MM-DD
  revisionCount: number;
  notes?: string;
}

export async function createOrUpdateRevisionTask(
  existingTaskId: string | undefined,
  payload: TaskPayload
): Promise<string> {
  const headers = await getAuthHeader();
  const taskListId = await getOrCreateTaskList();

  // Due date for Google Tasks RFC3339 format (needs to be T00:00:00.000Z)
  const dueDate = new Date(payload.revisionDate);
  dueDate.setUTCHours(0, 0, 0, 0);

  const taskBody = {
    title: `Revise: ${payload.topicName} [${payload.subjectName}] (#${payload.revisionCount + 1})`,
    notes: `Revision session for ${payload.topicName} in ${payload.subjectName}.${
      payload.notes ? `\nNotes: ${payload.notes}` : ''
    }`,
    due: dueDate.toISOString(),
    status: 'needsAction',
  };

  if (existingTaskId) {
    const updateRes = await tasksFetch(
      `https://tasks.googleapis.com/tasks/v1/lists/${taskListId}/tasks/${existingTaskId}`,
      {
        method: 'PATCH',
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(taskBody),
      }
    );

    if (updateRes.ok) {
      const data = await updateRes.json();
      return data.id;
    }
  }

  const createRes = await tasksFetch(
    `https://tasks.googleapis.com/tasks/v1/lists/${taskListId}/tasks`,
    {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(taskBody),
    }
  );

  if (!createRes.ok) {
    throw new Error(`Failed to create task: ${await createRes.text()}`);
  }

  const created = await createRes.json();
  return created.id;
}

export async function completeTask(taskId: string): Promise<void> {
  try {
    const headers = await getAuthHeader();
    const taskListId = await getOrCreateTaskList();

    await tasksFetch(
      `https://tasks.googleapis.com/tasks/v1/lists/${taskListId}/tasks/${taskId}`,
      {
        method: 'PATCH',
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'completed',
        }),
      }
    );
  } catch (err) {
    console.warn('Could not complete task in Google Tasks:', err);
  }
}

export async function deleteTask(taskId: string): Promise<void> {
  try {
    const headers = await getAuthHeader();
    const taskListId = await getOrCreateTaskList();

    const res = await tasksFetch(
      `https://tasks.googleapis.com/tasks/v1/lists/${taskListId}/tasks/${taskId}`,
      {
        method: 'DELETE',
        headers,
      }
    );

    if (!res.ok && res.status !== 404) {
      console.warn('Could not delete task:', await res.text());
    }
  } catch (err) {
    console.warn('Could not delete task from Google Tasks:', err);
  }
}
