import type { WhatsAppMessagingService } from '@car-spa/application';
import { httpsCallable } from 'firebase/functions';
import { getFirebaseFunctions } from '../firebase/client';

export class CallableWhatsAppMessagingService implements WhatsAppMessagingService {
  async sendMessage(message: { to: string; body: string }): Promise<void> {
    const sendWhatsAppMessage = httpsCallable<{ to: string; body: string }, { success: boolean }>(
      getFirebaseFunctions(),
      'sendWhatsAppMessage',
    );
    await sendWhatsAppMessage(message);
  }
}
