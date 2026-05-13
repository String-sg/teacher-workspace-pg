import { describe, expect, it } from 'vitest';

import type { SelectedEntity } from '~/components/comms/entity-selector';
import type { ReminderConfig } from '~/data/mock-pg-announcements';

import { getWebsiteLinkErrors, isCreatePostFormValid } from './createPostValidation';
import type { PostFormState } from './CreatePostView';

const recipient: SelectedEntity = {
  id: '1',
  label: 'P1 A',
  type: 'group',
  count: 30,
};

const validBase: PostFormState = {
  kind: 'announcement',
  title: 'Hello',
  description: 'Body text',
  descriptionDoc: {
    type: 'doc',
    content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Body text' }] }],
  },
  selectedRecipients: [recipient],
  responseType: 'view-only',
  questions: [],
  selectedStaff: [],
  enquiryEmail: 'a@b.sg',
  dueDate: '',
  reminder: { type: 'NONE' },
  websiteLinks: [],
  shortcuts: [],
  attachments: [],
  photos: [],
};

describe('isCreatePostFormValid — announcement', () => {
  it('passes with all required fields', () => {
    expect(isCreatePostFormValid(validBase, 'post')).toBe(true);
  });

  it('fails when title is empty', () => {
    expect(isCreatePostFormValid({ ...validBase, title: '' }, 'post')).toBe(false);
  });

  it('fails when description is empty', () => {
    // PGTW-11 new rule
    expect(isCreatePostFormValid({ ...validBase, description: '' }, 'post')).toBe(false);
  });

  it('fails when description exceeds 2000 characters', () => {
    const longDesc = 'a'.repeat(2001);
    expect(isCreatePostFormValid({ ...validBase, description: longDesc }, 'post')).toBe(false);
  });

  it('passes when description is exactly 2000 characters', () => {
    const maxDesc = 'a'.repeat(2000);
    expect(isCreatePostFormValid({ ...validBase, description: maxDesc }, 'post')).toBe(true);
  });

  it('fails when enquiry email is empty', () => {
    expect(isCreatePostFormValid({ ...validBase, enquiryEmail: '' }, 'post')).toBe(false);
  });

  it('fails when recipients are empty', () => {
    expect(isCreatePostFormValid({ ...validBase, selectedRecipients: [] }, 'post')).toBe(false);
  });
});

describe('isCreatePostFormValid — post-with-response (form)', () => {
  const formBase: PostFormState = {
    ...validBase,
    kind: 'form',
    responseType: 'acknowledge',
    dueDate: '2099-12-31',
  };

  it('passes with all required fields for acknowledge', () => {
    expect(isCreatePostFormValid(formBase, 'post-with-response')).toBe(true);
  });

  it('fails when due date is empty', () => {
    expect(isCreatePostFormValid({ ...formBase, dueDate: '' }, 'post-with-response')).toBe(false);
  });

  it('passes when reminder.type is NONE (PGTW-11 drop the over-strict check)', () => {
    // PGW allows NONE as a valid reminder choice.
    const reminder: ReminderConfig = { type: 'NONE' };
    expect(isCreatePostFormValid({ ...formBase, reminder }, 'post-with-response')).toBe(true);
  });
});

describe('getWebsiteLinkErrors', () => {
  it('returns no errors when both fields are empty', () => {
    expect(getWebsiteLinkErrors({ url: '', title: '' })).toEqual({});
  });

  it('returns no errors when both fields are filled with valid URL', () => {
    expect(getWebsiteLinkErrors({ url: 'https://example.com', title: 'Example' })).toEqual({});
  });

  it('requires title when only URL is filled', () => {
    const errors = getWebsiteLinkErrors({ url: 'https://example.com', title: '' });
    expect(errors.title).toBe('Description is required.');
    expect(errors.url).toBeUndefined();
  });

  it('requires URL when only title is filled', () => {
    const errors = getWebsiteLinkErrors({ url: '', title: 'My link' });
    expect(errors.url).toBe('URL is required.');
    expect(errors.title).toBeUndefined();
  });

  it('rejects invalid URL format', () => {
    const errors = getWebsiteLinkErrors({ url: 'not-a-url', title: 'My link' });
    expect(errors.url).toBe('Please enter a valid URL.');
  });

  it('rejects non-http(s) protocols', () => {
    const errors = getWebsiteLinkErrors({ url: 'ftp://files.example.com', title: 'FTP' });
    expect(errors.url).toBe('Please enter a valid URL.');
  });

  it('accepts http URLs', () => {
    expect(getWebsiteLinkErrors({ url: 'http://example.com', title: 'Example' })).toEqual({});
  });

  it('treats whitespace-only fields as empty', () => {
    expect(getWebsiteLinkErrors({ url: '   ', title: '   ' })).toEqual({});
  });
});

describe('isCreatePostFormValid — website links', () => {
  it('fails when a link has URL but no description', () => {
    const state = { ...validBase, websiteLinks: [{ url: 'https://example.com', title: '' }] };
    expect(isCreatePostFormValid(state, 'post')).toBe(false);
  });

  it('fails when a link has description but no URL', () => {
    const state = { ...validBase, websiteLinks: [{ url: '', title: 'My link' }] };
    expect(isCreatePostFormValid(state, 'post')).toBe(false);
  });

  it('fails when URL is invalid', () => {
    const state = { ...validBase, websiteLinks: [{ url: 'bad-url', title: 'My link' }] };
    expect(isCreatePostFormValid(state, 'post')).toBe(false);
  });

  it('passes when all links have both fields with valid URLs', () => {
    const state = {
      ...validBase,
      websiteLinks: [
        { url: 'https://example.com', title: 'Example' },
        { url: 'https://school.edu.sg', title: 'School site' },
      ],
    };
    expect(isCreatePostFormValid(state, 'post')).toBe(true);
  });

  it('passes with empty website links array', () => {
    expect(isCreatePostFormValid(validBase, 'post')).toBe(true);
  });
});
