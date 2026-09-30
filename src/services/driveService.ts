import { getAccessToken } from './auth';
import { DriveFileItem, RevisionSettings, SubjectItem, TopicItem, UploadProgress } from '../types';

const ROOT_FOLDER_NAME = 'ReviseDrive_StudyFiles';
const SETTINGS_FILE_NAME = '.revise_settings.json';
const CHUNK_SIZE = 4 * 1024 * 1024; // 4MB chunks (must be multiple of 256KB)

const defaultSettings: RevisionSettings = {
  frequency: 'spaced_repetition',
  reminderTime: '09:00',
  syncToCalendar: true,
  syncToTasks: true,
  revisionCount: 0,
};

async function getAuthHeader(): Promise<Record<string, string>> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('Not authenticated. Please sign in with Google.');
  }
  return {
    Authorization: `Bearer ${token}`,
  };
}

// Find or create the root folder for our app
export async function getOrCreateRootFolder(): Promise<string> {
  const headers = await getAuthHeader();
  const q = encodeURIComponent(
    `name = '${ROOT_FOLDER_NAME}' and mimeType = 'application/vnd.google-apps.folder' and 'root' in parents and trashed = false`
  );
  const searchRes = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id, name)`,
    { headers }
  );

  if (!searchRes.ok) {
    throw new Error(`Failed to search root folder: ${await searchRes.text()}`);
  }

  const data = await searchRes.json();
  if (data.files && data.files.length > 0) {
    return data.files[0].id;
  }

  // Create root folder
  const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      ...headers,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: ROOT_FOLDER_NAME,
      mimeType: 'application/vnd.google-apps.folder',
      parents: ['root'],
      description: 'ReviseDrive Root Folder for Subject and Topic organization',
    }),
  });

  if (!createRes.ok) {
    throw new Error(`Failed to create root folder: ${await createRes.text()}`);
  }

  const created = await createRes.json();
  return created.id;
}

// Fetch all subjects, topics, and files
export async function fetchFullStructure(): Promise<{
  rootFolderId: string;
  subjects: SubjectItem[];
}> {
  const rootFolderId = await getOrCreateRootFolder();
  const headers = await getAuthHeader();

  // 1. List all subject folders inside root
  const subQuery = encodeURIComponent(
    `'${rootFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`
  );
  const subjectsRes = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${subQuery}&orderBy=name&fields=files(id, name, createdTime)`,
    { headers }
  );

  if (!subjectsRes.ok) {
    throw new Error(`Failed to list subjects: ${await subjectsRes.text()}`);
  }

  const subjectsData = await subjectsRes.json();
  const rawSubjects = subjectsData.files || [];

  const subjects: SubjectItem[] = [];

  for (const sub of rawSubjects) {
    // 2. List topics inside this subject
    const topicQuery = encodeURIComponent(
      `'${sub.id}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`
    );
    const topicsRes = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${topicQuery}&orderBy=name&fields=files(id, name, createdTime, description)`,
      { headers }
    );
    const topicsData = topicsRes.ok ? await topicsRes.json() : { files: [] };
    const rawTopics = topicsData.files || [];

    const topics: TopicItem[] = [];

    for (const top of rawTopics) {
      // 3. List files inside this topic
      const filesQuery = encodeURIComponent(
        `'${top.id}' in parents and mimeType != 'application/vnd.google-apps.folder' and name != '${SETTINGS_FILE_NAME}' and trashed = false`
      );
      const filesRes = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=${filesQuery}&orderBy=name&fields=files(id, name, mimeType, size, webViewLink, webContentLink, thumbnailLink, iconLink, createdTime, modifiedTime)`,
        { headers }
      );
      const filesData = filesRes.ok ? await filesRes.json() : { files: [] };
      const rawFiles: DriveFileItem[] = (filesData.files || []).map((f: any) => ({
        id: f.id,
        name: f.name,
        mimeType: f.mimeType,
        size: f.size ? parseInt(f.size, 10) : 0,
        webViewLink: f.webViewLink,
        webContentLink: f.webContentLink,
        thumbnailLink: f.thumbnailLink,
        iconLink: f.iconLink,
        createdTime: f.createdTime,
        modifiedTime: f.modifiedTime,
      }));

      // 4. Fetch settings for this topic
      let settings = { ...defaultSettings };
      try {
        const settingsQuery = encodeURIComponent(
          `'${top.id}' in parents and name = '${SETTINGS_FILE_NAME}' and trashed = false`
        );
        const settingsRes = await fetch(
          `https://www.googleapis.com/drive/v3/files?q=${settingsQuery}&fields=files(id)`,
          { headers }
        );
        const settingsData = await settingsRes.json();
        if (settingsData.files && settingsData.files.length > 0) {
          const fileId = settingsData.files[0].id;
          const contentRes = await fetch(
            `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
            { headers }
          );
          if (contentRes.ok) {
            const parsed = await contentRes.json();
            settings = { ...defaultSettings, ...parsed };
          }
        } else if (top.description) {
          try {
            settings = { ...defaultSettings, ...JSON.parse(top.description) };
          } catch {
            // keep default
          }
        }
      } catch (err) {
        console.warn('Failed reading topic settings file:', err);
      }

      topics.push({
        id: top.id,
        name: top.name,
        subjectId: sub.id,
        subjectName: sub.name,
        createdTime: top.createdTime,
        files: rawFiles,
        settings,
      });
    }

    subjects.push({
      id: sub.id,
      name: sub.name,
      createdTime: sub.createdTime,
      topics,
    });
  }

  return { rootFolderId, subjects };
}

// Create a new Subject folder
export async function createSubject(name: string): Promise<SubjectItem> {
  const rootFolderId = await getOrCreateRootFolder();
  const headers = await getAuthHeader();

  const res = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      ...headers,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: name.trim(),
      mimeType: 'application/vnd.google-apps.folder',
      parents: [rootFolderId],
    }),
  });

  if (!res.ok) {
    throw new Error(`Failed to create subject: ${await res.text()}`);
  }

  const data = await res.json();
  return {
    id: data.id,
    name: data.name,
    topics: [],
    createdTime: new Date().toISOString(),
  };
}

// Create a new Topic folder
export async function createTopic(
  subjectId: string,
  subjectName: string,
  topicName: string,
  initialSettings?: Partial<RevisionSettings>
): Promise<TopicItem> {
  const headers = await getAuthHeader();
  const finalSettings: RevisionSettings = {
    ...defaultSettings,
    ...initialSettings,
  };

  const res = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      ...headers,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: topicName.trim(),
      mimeType: 'application/vnd.google-apps.folder',
      parents: [subjectId],
      description: JSON.stringify(finalSettings),
    }),
  });

  if (!res.ok) {
    throw new Error(`Failed to create topic: ${await res.text()}`);
  }

  const topicData = await res.json();
  const topicId = topicData.id;

  // Save settings file inside topic
  await saveTopicSettings(topicId, finalSettings);

  return {
    id: topicId,
    name: topicData.name,
    subjectId,
    subjectName,
    createdTime: new Date().toISOString(),
    files: [],
    settings: finalSettings,
  };
}

// Save topic revision settings
export async function saveTopicSettings(
  topicId: string,
  settings: RevisionSettings
): Promise<void> {
  const headers = await getAuthHeader();

  // Also update topic description for redundancy
  try {
    await fetch(`https://www.googleapis.com/drive/v3/files/${topicId}`, {
      method: 'PATCH',
      headers: {
        ...headers,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        description: JSON.stringify(settings),
      }),
    });
  } catch (err) {
    console.warn('Could not update folder description:', err);
  }

  // Find existing settings file
  const q = encodeURIComponent(
    `'${topicId}' in parents and name = '${SETTINGS_FILE_NAME}' and trashed = false`
  );
  const searchRes = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id)`,
    { headers }
  );
  const data = await searchRes.json();

  const fileContent = JSON.stringify(settings, null, 2);
  const blob = new Blob([fileContent], { type: 'application/json' });

  if (data.files && data.files.length > 0) {
    // Update existing
    const fileId = data.files[0].id;
    await fetch(
      `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`,
      {
        method: 'PATCH',
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
        body: blob,
      }
    );
  } else {
    // Create new multipart file
    const metadata = {
      name: SETTINGS_FILE_NAME,
      parents: [topicId],
      mimeType: 'application/json',
    };

    const boundary = '-------314159265358979323846';
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    const multipartRequestBody =
      delimiter +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      JSON.stringify(metadata) +
      delimiter +
      'Content-Type: application/json\r\n\r\n' +
      fileContent +
      closeDelimiter;

    await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
      {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': `multipart/related; boundary=${boundary}`,
        },
        body: multipartRequestBody,
      }
    );
  }
}

// Resumable upload for large files (supports up to 200MB reliably!)
export async function uploadFileToTopic(
  topicId: string,
  file: File,
  onProgress?: (progress: UploadProgress) => void,
  signal?: AbortSignal
): Promise<DriveFileItem> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('Not authenticated. Please sign in with Google.');
  }

  const initialProgress: UploadProgress = {
    fileName: file.name,
    fileSize: file.size,
    uploadedBytes: 0,
    percentage: 0,
    status: 'uploading',
  };
  onProgress?.(initialProgress);

  // Step 1: Initiate resumable session
  const metadata = {
    name: file.name,
    parents: [topicId],
    mimeType: file.type || 'application/octet-stream',
  };

  const initRes = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json; charset=UTF-8',
        'X-Upload-Content-Type': file.type || 'application/octet-stream',
        'X-Upload-Content-Length': file.size.toString(),
      },
      body: JSON.stringify(metadata),
      signal,
    }
  );

  if (!initRes.ok) {
    const errorText = await initRes.text();
    onProgress?.({
      ...initialProgress,
      status: 'error',
      errorMessage: `Initiation failed: ${errorText}`,
    });
    throw new Error(`Failed to initiate resumable upload: ${errorText}`);
  }

  const sessionUri = initRes.headers.get('Location');
  if (!sessionUri) {
    throw new Error('Google Drive did not return resumable session URI');
  }

  // Step 2: Upload chunks
  let startByte = 0;
  const totalBytes = file.size;

  while (startByte < totalBytes) {
    if (signal?.aborted) {
      throw new Error('Upload cancelled by user');
    }

    const endByte = Math.min(startByte + CHUNK_SIZE, totalBytes);
    const chunk = file.slice(startByte, endByte);
    const chunkLength = endByte - startByte;

    let retryCount = 0;
    let success = false;
    let chunkRes: Response | null = null;

    while (retryCount < 3 && !success) {
      try {
        chunkRes = await fetch(sessionUri, {
          method: 'PUT',
          headers: {
            'Content-Length': chunkLength.toString(),
            'Content-Range': `bytes ${startByte}-${endByte - 1}/${totalBytes}`,
            'Content-Type': file.type || 'application/octet-stream',
          },
          body: chunk,
          signal,
        });

        if (chunkRes.status === 308) {
          // Resume incomplete, continue to next chunk
          success = true;
          startByte = endByte;
          const percentage = Math.round((startByte / totalBytes) * 100);
          onProgress?.({
            fileName: file.name,
            fileSize: totalBytes,
            uploadedBytes: startByte,
            percentage,
            status: 'uploading',
          });
        } else if (chunkRes.ok) {
          // Upload complete!
          success = true;
          const completedData = await chunkRes.json();
          onProgress?.({
            fileName: file.name,
            fileSize: totalBytes,
            uploadedBytes: totalBytes,
            percentage: 100,
            status: 'completed',
          });

          return {
            id: completedData.id,
            name: completedData.name,
            mimeType: completedData.mimeType,
            size: totalBytes,
            webViewLink: completedData.webViewLink,
            webContentLink: completedData.webContentLink,
            createdTime: new Date().toISOString(),
          };
        } else {
          retryCount++;
          await new Promise((r) => setTimeout(r, 1000 * retryCount));
        }
      } catch (err: any) {
        if (signal?.aborted) throw err;
        retryCount++;
        if (retryCount >= 3) throw err;
        await new Promise((r) => setTimeout(r, 1000 * retryCount));
      }
    }

    if (!success) {
      const errText = chunkRes ? await chunkRes.text() : 'Network error';
      throw new Error(`Chunk upload failed after 3 attempts: ${errText}`);
    }
  }

  throw new Error('Upload reached unexpected end of loop');
}

// Delete a file from Google Drive
export async function deleteDriveFile(fileId: string): Promise<void> {
  const headers = await getAuthHeader();
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
    method: 'DELETE',
    headers,
  });

  if (!res.ok && res.status !== 404) {
    throw new Error(`Failed to delete file: ${await res.text()}`);
  }
}

// Rename folder or file
export async function renameDriveItem(itemId: string, newName: string): Promise<void> {
  const headers = await getAuthHeader();
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${itemId}`, {
    method: 'PATCH',
    headers: {
      ...headers,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name: newName.trim() }),
  });

  if (!res.ok) {
    throw new Error(`Failed to rename: ${await res.text()}`);
  }
}
