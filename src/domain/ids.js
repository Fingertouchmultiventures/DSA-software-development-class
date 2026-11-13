import { randomBytes, randomUUID } from 'node:crypto';

const REFERENCE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const DEFAULT_REFERENCE_LENGTH = 32;

export function newId() {
  return randomUUID();
}

export function newReference() {
  const bytes = randomBytes(DEFAULT_REFERENCE_LENGTH);
  let reference = '';

  for (const byte of bytes) {
    reference += REFERENCE_ALPHABET[byte % REFERENCE_ALPHABET.length];
  }

  return reference;
}
