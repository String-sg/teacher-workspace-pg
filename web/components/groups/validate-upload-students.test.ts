import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  validateUploadStudents,
  type ValidStudent,
  type InvalidStudent,
} from './validate-upload-students';

function mockFetchSequence(responses: { body: unknown; status?: number }[]) {
  const fetchMock = vi.fn();
  for (const resp of responses) {
    fetchMock.mockResolvedValueOnce({
      ok: (resp.status ?? 200) < 400,
      status: resp.status ?? 200,
      json: () => Promise.resolve(resp.body),
    });
  }
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('validateUploadStudents', () => {
  it('sends IHL payload and returns valid/invalid students after polling', async () => {
    const validStudents: ValidStudent[] = [
      {
        pgStudentId: 1001,
        studentId: 'S1111111A',
        studentName: 'Alice',
        className: 'T02',
        classCode: 'IHL-TP-2-002',
        levelCode: 'IHL-TP-001',
        levelCodeDescription: 'COMMON BUSINESS',
      },
    ];
    const invalidStudents: InvalidStudent[] = [
      { studentId: 'S9999999Z', message: 'Student not found', row: 2 },
    ];

    const fetchMock = mockFetchSequence([
      { body: { body: { token: 'abc123' }, resultCode: 1, message: 'ok' } },
      {
        body: {
          body: { status: 'success', data: { validStudents, invalidStudents }, error: null },
          resultCode: 1,
          message: 'ok',
        },
      },
    ]);

    const promise = validateUploadStudents({
      type: 'ihl',
      students: [{ studentId: 'S1111111A' }, { studentId: 'S9999999Z' }],
    });
    await vi.advanceTimersByTimeAsync(0);
    const result = await promise;

    expect(result.validStudents).toEqual(validStudents);
    expect(result.invalidStudents).toEqual(invalidStudents);
    expect(fetchMock).toHaveBeenCalledTimes(2);

    const [firstUrl, firstOpts] = fetchMock.mock.calls[0];
    expect(firstUrl).toContain('/groups/custom/validateStudents');
    expect(JSON.parse(firstOpts.body)).toEqual([
      { studentId: 'S1111111A' },
      { studentId: 'S9999999Z' },
    ]);
  });

  it('sends MS payload with name+className fields', async () => {
    const fetchMock = mockFetchSequence([
      { body: { body: { token: 'tok' }, resultCode: 1, message: 'ok' } },
      {
        body: {
          body: {
            status: 'success',
            data: { validStudents: [], invalidStudents: [] },
            error: null,
          },
          resultCode: 1,
          message: 'ok',
        },
      },
    ]);

    const promise = validateUploadStudents({
      type: 'ms',
      students: [{ name: 'Alice', className: '1A' }],
    });
    await vi.advanceTimersByTimeAsync(0);
    await promise;

    const [, firstOpts] = fetchMock.mock.calls[0];
    expect(JSON.parse(firstOpts.body)).toEqual([{ name: 'Alice', className: '1A' }]);
  });

  it('polls until status is success', async () => {
    const fetchMock = mockFetchSequence([
      { body: { body: { token: 'tok' }, resultCode: 1, message: 'ok' } },
      {
        body: {
          body: {
            status: 'pending',
            data: { validStudents: [], invalidStudents: [] },
            error: null,
          },
          resultCode: 1,
          message: 'ok',
        },
      },
      {
        body: {
          body: {
            status: 'pending',
            data: { validStudents: [], invalidStudents: [] },
            error: null,
          },
          resultCode: 1,
          message: 'ok',
        },
      },
      {
        body: {
          body: {
            status: 'success',
            data: {
              validStudents: [
                {
                  pgStudentId: 1,
                  studentId: 'S1',
                  studentName: 'A',
                  className: 'B',
                  classCode: 'C',
                  levelCode: 'D',
                  levelCodeDescription: 'E',
                },
              ],
              invalidStudents: [],
            },
            error: null,
          },
          resultCode: 1,
          message: 'ok',
        },
      },
    ]);

    const promise = validateUploadStudents({ type: 'ihl', students: [{ studentId: 'S1' }] });

    // First poll returns pending
    await vi.advanceTimersByTimeAsync(3000);
    // Second poll returns pending
    await vi.advanceTimersByTimeAsync(3000);
    // Third poll returns success
    await vi.advanceTimersByTimeAsync(3000);

    const result = await promise;
    expect(result.validStudents).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it('throws when server returns error status in poll', async () => {
    mockFetchSequence([
      { body: { body: { token: 'tok' }, resultCode: 1, message: 'ok' } },
      {
        body: {
          body: { status: 'error', data: null, error: 'Processing failed' },
          resultCode: 1,
          message: 'ok',
        },
      },
    ]);

    await expect(
      validateUploadStudents({ type: 'ihl', students: [{ studentId: 'S1' }] }),
    ).rejects.toThrow('Processing failed');
  });

  it('throws when initial validate call fails', async () => {
    mockFetchSequence([{ body: { resultCode: -1, message: 'Bad request' }, status: 400 }]);

    await expect(validateUploadStudents({ type: 'ihl', students: [] })).rejects.toThrow(
      'Bad request',
    );
  });
});
