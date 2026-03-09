export interface ExtractionProgressEvent {
  step: number;
  total: number;
  message: string;
  recipeId?: number;
  error?: string;
}

export class SSEWriter {
  private controller: ReadableStreamDefaultController;
  private encoder: TextEncoder;

  constructor(controller: ReadableStreamDefaultController) {
    this.controller = controller;
    this.encoder = new TextEncoder();
  }

  write(event: ExtractionProgressEvent) {
    try {
      const dataString = JSON.stringify(event);
      this.controller.enqueue(this.encoder.encode(`data: ${dataString}\n\n`));
    } catch (e) {
      console.error('SSE write error', e);
    }
  }

  close() {
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
