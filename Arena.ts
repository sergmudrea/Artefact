// kernel/hive/Arena.ts
// Isolated environment for testing mutated code

import { EventEmitter } from 'events';
import { Void } from '../core/Void';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface ArenaResult {
    success: boolean;
    output: string;
    error: string | null;
    executionTime: number;
    memoryUsage: number;
    fitness: number;
}

export class Arena extends EventEmitter {
    private static instance: Arena;
    private voidManager: Void;
    private sandboxPath: string;
    private timeoutMs: number = 5000;
    private maxMemoryMB: number = 256;
    
    private constructor() {
        super();
        this.voidManager = Void.getInstance();
        this.sandboxPath = process.env.ARENA_SANDBOX_PATH || './sandbox';
    }
    
    static getInstance(): Arena {
        if (!Arena.instance) Arena.instance = new Arena();
        return Arena.instance;
    }
    
    async testCode(code: string, testId: string): Promise<ArenaResult> {
        const startTime = Date.now();
        const startMemory = process.memoryUsage().heapUsed;
        
        try {
            // Write code to temporary file
            const tempFile = `${this.sandboxPath}/test_${testId}.js`;
            const { writeFile, unlink } = await import('fs/promises');
            
            await writeFile(tempFile, code);
            
            // Execute in sandbox with timeout and memory limit
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Timeout')), this.timeoutMs);
            });
            
            const executionPromise = execAsync(`node --max-old-space-size=${this.maxMemoryMB} ${tempFile}`);
            
            const { stdout, stderr } = await Promise.race([executionPromise, timeoutPromise]) as any;
            
            // Clean up
            await unlink(tempFile).catch(() => {});
            
            const executionTime = Date.now() - startTime;
            const memoryUsage = process.memoryUsage().heapUsed - startMemory;
            
            // Calculate fitness based on execution success
            let fitness = 0.5;
            if (!stderr) fitness += 0.3;
            if (stdout.length > 0) fitness += 0.1;
            fitness += Math.max(0, 1 - executionTime / this.timeoutMs) * 0.1;
            
            return {
                success: !stderr,
                output: stdout,
                error: stderr || null,
                executionTime,
                memoryUsage,
                fitness: Math.min(1, fitness)
            };
        } catch (error) {
            return {
                success: false,
                output: '',
                error: error instanceof Error ? error.message : String(error),
                executionTime: Date.now() - startTime,
                memoryUsage: 0,
                fitness: 0
            };
        }
    }
}

export const arena = Arena.getInstance();
