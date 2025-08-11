// file: src/app/api/analyze/route.ts
import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { processReplaysInFolder } from '@/lib/replayParser';

export const runtime = 'nodejs'; // гарантує доступ до fs/os у середовищі Next.js

export async function POST(request: Request) {
    let tempDir: string | null = null;

    try {
        const formData = await request.formData();
        const files = (formData.getAll('replays') as File[]).filter(Boolean);

        if (!files.length) {
            return NextResponse.json({ error: 'Файли не завантажено' }, { status: 400 });
        }

        // створюємо тимчасову теку
        tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'wot-replays-'));

        // зберігаємо всі файли у тимчасову теку (з безпечними назвами)
        await Promise.all(
            files.map(async (file, i) => {
                const buf = Buffer.from(await file.arrayBuffer());
                const safeName = path.basename(file.name || `replay_${i}.wotreplay`);
                await fs.writeFile(path.join(tempDir!, safeName), buf);
            })
        );

        // парсимо тека з реплеями через TS-парсер
        const results = processReplaysInFolder(tempDir);

        return NextResponse.json(results, { status: 200 });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Невідома серверна помилка';
        console.error('SERVER ERROR:', message);
        return NextResponse.json({ error: message }, { status: 500 });
    } finally {
        if (tempDir) {
            try {
                await fs.rm(tempDir, { recursive: true, force: true });
            } catch {
                // ігноруємо помилку видалення
            }
        }
    }
}
