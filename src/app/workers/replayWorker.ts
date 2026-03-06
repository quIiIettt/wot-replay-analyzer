/// <reference lib="webworker" />

import { processAbsReplayFiles, processRandomReplayFiles } from '@/lib/browserReplayParsers';

type AnalyzeRequestMessage = {
  type: 'analyze';
  mode: 'abs' | 'random';
  files: File[];
};

type ProgressMessage = {
  type: 'progress';
  processed: number;
  total: number;
};

type ResultMessage = {
  type: 'result';
  mode: 'abs' | 'random';
  result: unknown;
};

type ErrorMessage = {
  type: 'error';
  error: string;
};

function postProgress(processed: number, total: number): void {
  const message: ProgressMessage = { type: 'progress', processed, total };
  self.postMessage(message);
}

self.onmessage = async (event: MessageEvent<AnalyzeRequestMessage>) => {
  const message = event.data;
  if (!message || message.type !== 'analyze') {
    return;
  }

  try {
    if (message.mode === 'abs') {
      const result = await processAbsReplayFiles(message.files, postProgress);
      const payload: ResultMessage = { type: 'result', mode: 'abs', result };
      self.postMessage(payload);
      return;
    }

    const result = await processRandomReplayFiles(message.files, postProgress);
    const payload: ResultMessage = { type: 'result', mode: 'random', result };
    self.postMessage(payload);
  } catch (error: unknown) {
    const errorMessage: ErrorMessage = {
      type: 'error',
      error: error instanceof Error ? error.message : 'Replay processing failed.',
    };
    self.postMessage(errorMessage);
  }
};

export {};
