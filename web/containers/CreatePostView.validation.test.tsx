import { describe, expect, it } from 'vitest';

import type { SelectedEntity } from '~/components/comms/entity-selector';
import type { FormQuestion, ReminderConfig } from '~/data/mock-pg-announcements';

import { isCreatePostFormValid } from './createPostValidation';
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

  const question: FormQuestion = { id: '1', text: 'Favourite colour?', type: 'free-text' };

  it('passes with valid custom questions', () => {
    expect(
      isCreatePostFormValid({ ...formBase, questions: [question] }, 'post-with-response'),
    ).toBe(true);
  });

  it('fails when question text exceeds 120 characters', () => {
    const long: FormQuestion = { ...question, text: 'a'.repeat(121) };
    expect(isCreatePostFormValid({ ...formBase, questions: [long] }, 'post-with-response')).toBe(
      false,
    );
  });

  it('passes when question text is exactly 120 characters', () => {
    const atLimit: FormQuestion = { ...question, text: 'a'.repeat(120) };
    expect(isCreatePostFormValid({ ...formBase, questions: [atLimit] }, 'post-with-response')).toBe(
      true,
    );
  });

  it('fails when question description exceeds 250 characters', () => {
    const long: FormQuestion = { ...question, description: 'a'.repeat(251) };
    expect(isCreatePostFormValid({ ...formBase, questions: [long] }, 'post-with-response')).toBe(
      false,
    );
  });

  it('passes when question description is exactly 250 characters', () => {
    const atLimit: FormQuestion = { ...question, description: 'a'.repeat(250) };
    expect(isCreatePostFormValid({ ...formBase, questions: [atLimit] }, 'post-with-response')).toBe(
      true,
    );
  });
});
