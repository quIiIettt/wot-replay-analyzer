// file: src/app/api/analyze-random/route.ts
import { NextResponse } from 'next/server';
import { processReplayFilesWithReport } from '@/lib/randomReplayParser';

export const runtime = 'nodejs';

export async function POST(request: Request) {
    try {
        const formData = await request.formData();
        const files = (formData.getAll('replays') as File[]).filter(Boolean);
        if (!files.length) return NextResponse.json({ error: 'No files uploaded' }, { status: 400 });

        const items = await Promise.all(
            files.map(async (f, i) => ({
                name: f.name || `replay_${i}.wotreplay`,
                data: Buffer.from(await f.arrayBuffer()),
            }))
        );

        const report = processReplayFilesWithReport(items); // <- ніколи не кидає
        return NextResponse.json(report, { status: 200 });
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Unknown server error';
        // навіть тут віддамо JSON, не HTML
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
