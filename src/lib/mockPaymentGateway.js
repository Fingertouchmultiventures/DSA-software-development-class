import { DomainError } from '../domain/errors.js';
import { requireText, requireWholeNumber } from '../domain/validation.js';

export function createMockPaymentGateway() {
  return {
    async charge({ paymentToken, amountCents }) {
      paymentToken = requireText(paymentToken, 'paymentToken');
      if (!['tok_success', 'tok_declined'].includes(paymentToken)) {
        throw new DomainError('VALIDATION', 'paymentToken is not a supported mock token');
      }
      requireWholeNumber(amountCents, 'amountCents', 0);
      return { success: paymentToken !== 'tok_declined' };
    },
  };
}
