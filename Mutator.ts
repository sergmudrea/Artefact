// kernel/hive/Mutator.ts
// Generates mutations of code for evolutionary testing

import { Arena, arena } from './Arena';
import { Void } from '../core/Void';

export interface MutationResult {
    originalCode: string;
    mutatedCode: string;
    fitness: number;
    mutationsApplied: string[];
}

export class Mutator {
    private static instance: Mutator;
    private voidManager: Void;
    private mutationPatterns: ((code: string) => string)[];
    
    private constructor() {
        this.voidManager = Void.getInstance();
        this.mutationPatterns = this.initMutationPatterns();
    }
    
    static getInstance(): Mutator {
        if (!Mutator.instance) Mutator.instance = new Mutator();
        return Mutator.instance;
    }
    
    private initMutationPatterns(): ((code: string) => string)[] {
        return [
            (code) => code.replace(/==/g, '!='),
            (code) => code.replace(/</g, '>'),
            (code) => code.replace(/\+\+/g, '--'),
            (code) => code.replace(/var /g, 'let '),
            (code) => code.replace(/let /g, 'const '),
            (code) => code.replace(/if\(/g, 'if(!'),
            (code) => code.replace(/while\(/g, 'for('),
            (code) => code.replace(/true/g, 'false'),
            (code) => code.replace(/false/g, 'true'),
            (code) => code.replace(/&&/g, '||'),
            (code) => code.replace(/\|\|/g, '&&')
        ];
    }
    
    async mutate(code: string, intensity: number = 0.3): Promise<MutationResult> {
        let mutated = code;
        const mutationsApplied: string[] = [];
        
        const numMutations = Math.max(1, Math.floor(this.mutationPatterns.length * intensity));
        
        for (let i = 0; i < numMutations; i++) {
            const pattern = this.mutationPatterns[Math.floor(Math.random() * this.mutationPatterns.length)];
            const before = mutated;
            mutated = pattern(mutated);
            if (before !== mutated) {
                mutationsApplied.push(pattern.name || 'unknown');
            }
        }
        
        const testId = `mut_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
        const result = await arena.testCode(mutated, testId);
        
        return {
            originalCode: code,
            mutatedCode: mutated,
            fitness: result.fitness,
            mutationsApplied
        };
    }
    
    async batchMutate(code: string, count: number): Promise<MutationResult[]> {
        const promises: Promise<MutationResult>[] = [];
        
        for (let i = 0; i < count; i++) {
            const intensity = Math.random();
            promises.push(this.mutate(code, intensity));
        }
        
        return await Promise.all(promises);
    }
}

export const mutator = Mutator.getInstance();
