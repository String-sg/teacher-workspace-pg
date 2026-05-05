import type { SelectedEntity } from '~/components/comms/entity-selector';

export function summariseRecipients(recipients: SelectedEntity[]): string | null {
  if (recipients.length === 0) return null;

  const individual = recipients.find((r) => r.type === 'individual');
  if (individual) return individual.label.toUpperCase();

  for (const r of recipients) {
    if (r.memberNames && r.memberNames.length > 0) {
      return r.memberNames[0].toUpperCase();
    }
  }

  return null;
}
