import { randomUUID } from 'node:crypto';

const MAX_CAPTURED_EVENTS = 500;

class WebhookTestSinkService {
  static capturedEvents = [];

  static captureRequest(req) {
    const event = {
      id: randomUUID(),
      receivedAt: new Date().toISOString(),
      method: req.method,
      path: req.originalUrl,
      headers: req.headers || {},
      query: req.query || {},
      body: req.body || null,
    };

    this.capturedEvents.unshift(event);

    if (this.capturedEvents.length > MAX_CAPTURED_EVENTS) {
      this.capturedEvents.length = MAX_CAPTURED_EVENTS;
    }

    return event;
  }

  static listCapturedEvents({ limit = 50 } = {}) {
    const safeLimit = Math.min(Math.max(Number.parseInt(limit, 10) || 50, 1), 200);
    return this.capturedEvents.slice(0, safeLimit);
  }

  static clearCapturedEvents() {
    const removed = this.capturedEvents.length;
    this.capturedEvents = [];
    return removed;
  }
}

export default WebhookTestSinkService;
