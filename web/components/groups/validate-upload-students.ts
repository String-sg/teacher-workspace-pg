const API_BASE = '/api/web/2/staff';
const POLL_INTERVAL_MS = 3000;
const MAX_POLL_ATTEMPTS = 100;

export interface ValidStudent {
  pgStudentId: number;
  studentId: string;
  studentName: string;
  className: string;
  classCode: string;
  levelCode: string;
  levelCodeDescription: string;
  uinFinNo?: string;
  indexNumber?: string;
  cca?: { ccaId: number; ccaDescription: string }[];
}

export interface InvalidStudent {
  studentId?: string;
  name?: string;
  className?: string;
  message: string;
  row: number;
}

export interface ValidateResult {
  validStudents: ValidStudent[];
  invalidStudents: InvalidStudent[];
}

interface IhlPayload {
  type: 'ihl';
  students: { studentId: string }[];
}
interface MsPayload {
  type: 'ms';
  students: { name: string; className: string }[];
}

export async function validateUploadStudents(
  payload: IhlPayload | MsPayload,
): Promise<ValidateResult> {
  const body = JSON.stringify(payload.students);

  const res = await fetch(`${API_BASE}/groups/custom/validateStudents`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message ?? 'Validation request failed');
  }

  const json = (await res.json()) as { body: { token: string }; resultCode: number };
  const { token } = json.body;

  return pollResults(token);
}

async function pollResults(token: string): Promise<ValidateResult> {
  for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
    if (attempt > 0) {
      await sleep(POLL_INTERVAL_MS);
    }

    const res = await fetch(`${API_BASE}/groups/custom/validateStudents/results`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ token }),
    });

    const json = (await res.json()) as {
      body: { status: string; data: ValidateResult | null; error: string | null };
    };

    const { status, data, error } = json.body;

    if (status === 'success' && data) {
      return data;
    }

    if (status === 'error') {
      throw new Error(error ?? 'Validation failed');
    }
  }

  throw new Error(`Validation timed out after ${MAX_POLL_ATTEMPTS} attempts`);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
