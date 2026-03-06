import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { processReplaysInFolder } from '@/lib/replayParser';

export const runtime = 'nodejs'; // Ensures fs/os access in the Next.js runtime.

export async function POST(request: Request) {
  let tempDir: string | null = null;

  try {
    const formData = await request.formData();
    const files = (formData.getAll('replays') as File[]).filter(Boolean);

    if (!files.length) {
      return NextResponse.json({ error: 'No files were uploaded.' }, { status: 400 });
    }

    // Create a temporary folder for uploaded replay files.
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'wot-replays-'));

    // Save uploaded files using sanitized names.
    await Promise.all(
      files.map(async (file, index) => {
        const buffer = Buffer.from(await file.arrayBuffer());
        const safeName = `${index}_${path.basename(file.name || `replay_${index}.wotreplay`)}`;
        await fs.writeFile(path.join(tempDir!, safeName), buffer);
      })
    );

    const results = processReplaysInFolder(tempDir);
    return NextResponse.json(results, { status: 200 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown server error.';
    console.error('SERVER ERROR:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  } finally {
    if (tempDir) {
      try {
        await fs.rm(tempDir, { recursive: true, force: true });
      } catch {
        // Ignore cleanup errors.
      }
    }
  }
}
