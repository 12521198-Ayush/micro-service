import { createHmac } from 'node:crypto';

export const buildWebhookSignature = ({ signingSecret, timestamp, payloadText }) => {
  if (!signingSecret) {
    return null;
  }

  const baseString = `${timestamp}.${payloadText}`;
  const digest = createHmac('sha256', signingSecret).update(baseString).digest('hex');
  return `sha256=${digest}`;
};

export default {
  buildWebhookSignature,
};
