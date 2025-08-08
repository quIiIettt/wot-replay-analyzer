// file: app/api/analyze/route.ts
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

        tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'wot-replays-'));

        for (const file of files) {
            const buffer = Buffer.from(await file.arrayBuffer());
            await fs.writeFile(path.join(tempDir, file.name), buffer);
        }

        // FIX 1: Додаємо перевірку, щоб переконати TypeScript, що tempDir не є null
        if (!tempDir) {
            throw new Error("Не вдалося створити тимчасову теку.");
        }

        const results = await new Promise((resolve, reject) => {
            const pythonExecutable = 'python3';
            const scriptPath = path.resolve('./scripts/parser.py');

            console.log(`🚀 Запускаю скрипт: ${pythonExecutable} ${scriptPath} ${tempDir}`);

            // Тепер TypeScript впевнений, що tempDir - це рядок (string)
            const pythonProcess = spawn(pythonExecutable, [scriptPath, tempDir]);

            let stdout = '';
            let stderr = '';

            // FIX 2: Вказуємо тип `Buffer` для параметра data
            pythonProcess.stdout.on('data', (data: Buffer) => {
                stdout += data.toString();
            });

            // FIX 2: Вказуємо тип `Buffer` для параметра data
            pythonProcess.stderr.on('data', (data: Buffer) => {
                console.error(`PYTHON STDERR: ${data.toString()}`);
                stderr += data.toString();
            });

            pythonProcess.on('close', (code) => {
                console.log(`🐍 Python-скрипт завершився з кодом: ${code}`);
                console.log(`STDOUT: ${stdout.slice(0, 200)}...`);

                if (code === 0) {
                    try {
                        resolve(JSON.parse(stdout));
                    } catch (e) {
                        reject(new Error('Помилка парсингу JSON з Python. Можливо, вивід порожній або некоректний.'));
                    }
                } else {
                    reject(new Error(`Помилка виконання Python-скрипта: ${stderr}`));
                }
            });

            pythonProcess.on('error', (err) => {
                console.error("Помилка запуску процесу Python:", err);
                // Спробуємо запустити з 'python', якщо 'python3' не знайдено
                if ((err as any).code === 'ENOENT') {
                    reject(new Error(`Команду '${pythonExecutable}' не знайдено. Перевірте, чи встановлено Python і чи доступний він у системному PATH як 'python3' або 'python'.`));
                } else {
                    reject(new Error(`Не вдалося запустити Python: ${err.message}`));
                }
            });
        });

        return NextResponse.json(results);

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Невідома серверна помилка';
        console.error("SERVER ERROR:", errorMessage);
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    } finally {
        if (tempDir) {
            await fs.rm(tempDir, { recursive: true, force: true });
        }
    }
}