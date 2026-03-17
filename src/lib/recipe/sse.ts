export interface ExtractionProgressEvent {
  step: number;
  total: number;
  message: string;
  recipeId?: number;
  error?: string;
  thumbnailUrl?: string | null;
  title?: string;
}

export class SSEWriter {
  private controller: ReadableStreamDefaultController;
  private encoder: TextEncoder;
  private closed: boolean;

  constructor(controller: ReadableStreamDefaultController) {
    this.controller = controller;
    this.encoder = new TextEncoder();
    this.closed = false;
  }

  write(event: ExtractionProgressEvent) {
    if (this.closed) return;
    try {
      const dataString = JSON.stringify(event);
      this.controller.enqueue(this.encoder.encode(`data: ${dataString}\n\n`));
    } catch (e) {
      console.error('SSE write error', e);
    }
  }

  close() {
    if (this.closed) return;
    this.closed = true;
    try {
      this.controller.close();
    } catch (e) {
      console.error('SSE close error', e);
    }
  }

  error(err: unknown) {
    try {
      this.controller.error(err);
    } catch (e) {
      console.error('SSE controller error call failed', e);
    }
  }
}
