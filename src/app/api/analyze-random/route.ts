// file: src/app/api/analyze-random/route.ts
import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

export async function POST(request: Request) {
    let tempDir: string | null = null;
    try {
        const formData = await request.formData();
        const files = formData.getAll('replays') as File[];

        if (!files || files.length === 0) {
            return NextResponse.json({ error: 'Файли не завантажено' }, { status: 400 });
        }

        tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'wot-replays-random-'));

        for (const file of files) {
            const buffer = Buffer.from(await file.arrayBuffer());
            await fs.writeFile(path.join(tempDir, file.name), buffer);
        }

        if (!tempDir) {
            throw new Error("Не вдалося створити тимчасову теку.");
        }

        const finalTempDir = tempDir;

        const results = await new Promise((resolve, reject) => {
            const pythonExecutable = 'python';
            // --- КЛЮЧОВА ЗМІНА: Викликаємо новий скрипт ---
            const scriptPath = path.resolve('./scripts/random_parser.py');

            console.log(`Запускаю скрипт для рандому: ${pythonExecutable} ${scriptPath} ${finalTempDir}`);

            const pythonProcess = spawn(pythonExecutable, [scriptPath, finalTempDir]);

            let stdout = '';
            let stderr = '';

            pythonProcess.stdout.on('data', (data: Buffer) => {
                stdout += data.toString();
            });

            pythonProcess.stderr.on('data', (data: Buffer) => {
                console.error(`PYTHON STDERR: ${data.toString()}`);
                stderr += data.toString();
            });

            pythonProcess.on('close', (code) => {
                console.log(`Python-скрипт (рандом) завершився з кодом: ${code}`);
                if (code === 0) {
                    try {
                        if (stdout.trim() === '') {
                            reject(new Error('Python-скрипт повернув порожній результат.'));
                            return;
                        }
                        resolve(JSON.parse(stdout));
                    } catch (e) {
                        reject(new Error('Помилка парсингу JSON з Python.'));
                    }
                } else {
                    reject(new Error(`Помилка виконання Python-скрипта: ${stderr}`));
                }
            });

            pythonProcess.on('error', (err) => {
                console.error("Помилка запуску процесу Python:", err);
                if ((err as { code?: string }).code === 'ENOENT') {
                    reject(new Error(`Команду '${pythonExecutable}' не знайдено на сервері.`));
                } else {
                    reject(new Error(`Не вдалося запустити Python: ${err.message}`));
                }
            });
        });

        return NextResponse.json(results);

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Невідома серверна помилка';
        console.error("SERVER ERROR (random):", errorMessage);
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    } finally {
        if (tempDir) {
            await fs.rm(tempDir, { recursive: true, force: true });
        }
    }
}