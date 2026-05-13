// kernel/echo/Forger.ts
// False memory creation system. Defends against memory dumping.

import { Nexus } from '../core/Nexus';
import { Void } from '../core/Void';
import { recaller, Memory } from './Recaller';

export interface FalseMemory {
    id: string;
    originalId: string;
    modifiedContent: any;
    confidence: number;
    createdAt: number;
}

export class Forger {
    private static instance: Forger;
    private nexus: Nexus;
    private voidManager: Void;
    private falseMemories: Map<string, FalseMemory> = new Map();
    private forgeryRate: number = 0.05; // 5% of memories are forgeries
    private isActive: boolean = true;
    
    private constructor() {
        this.nexus = Nexus.getInstance();
        this.voidManager = Void.getInstance();
    }
    
    static getInstance(): Forger {
        if (!Forger.instance) Forger.instance = new Forger();
        return Forger.instance;
    }
    
    forgeFromMemory(original: Memory): FalseMemory {
        const modifiedContent = this.modifyContent(original.content);
        const forgery: FalseMemory = {
            id: `forgery_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`,
            originalId: original.id,
            modifiedContent,
            confidence: Math.random() * 0.5 + 0.3, // 30-80% confidence
            createdAt: Date.now()
        };
        
        this.falseMemories.set(forgery.id, forgery);
        
        // Store the forged memory as if it were real
        recaller.store({
            type: original.type,
            content: modifiedContent,
            importance: original.importance * 0.6,
            tags: [...original.tags, 'forged']
        });
        
        this.nexus.post({
            from: 'genetic',
            to: 'symbolic',
            type: 'mutation',
            payload: { event: 'forgery_created', originalId: original.id },
            timestamp: Date.now()
        });
        
        return forgery;
    }
    
    private modifyContent(content: any): any {
        if (typeof content === 'string') {
            return this.mutateString(content);
        }
        if (typeof content === 'number') {
            return content + (Math.random() - 0.5) * content * 0.1;
        }
        if (Array.isArray(content)) {
            return content.map(item => this.modifyContent(item));
        }
        if (typeof content === 'object' && content !== null) {
            const mutated: any = {};
            for (const [key, value] of Object.entries(content)) {
                if (Math.random() < 0.3) {
                    mutated[key] = this.modifyContent(value);
                } else {
                    mutated[key] = value;
                }
            }
            return mutated;
        }
        if (typeof content === 'boolean') {
            return Math.random() < 0.2 ? !content : content;
        }
        return content;
    }
    
    private mutateString(str: string): string {
        const mutations = [
            (s: string) => s.split('').reverse().join(''),
            (s: string) => s.replace(/a/g, '@').replace(/e/g, '3').replace(/i/g, '1'),
            (s: string) => s + (Math.random() > 0.5 ? ' FALSE' : ' TRUE'),
            (s: string) => s.slice(0, Math.floor(s.length * 0.7)),
            (s: string) => s + s.slice(-5),
            (s: string) => s.split(' ').reverse().join(' ')
        ];
        
        const mutation = mutations[Math.floor(Math.random() * mutations.length)];
        return mutation(str);
    }
    
    async poisonMemoryPool(): Promise<void> {
        const realMemories = recaller.recall({}, 100);
        const forgeries: FalseMemory[] = [];
        
        for (const memory of realMemories) {
            if (Math.random() < this.forgeryRate) {
                const forgery = this.forgeFromMemory(memory);
                forgeries.push(forgery);
            }
        }
        
        console.log(`Forger: Poisoned memory pool with ${forgeries.length} forgeries.`);
        
        this.nexus.post({
            from: 'genetic',
            to: 'all',
            type: 'mutation',
            payload: { event: 'memory_pool_poisoned', count: forgeries.length },
            timestamp: Date.now()
        });
    }
    
    verifyMemory(memoryId: string): boolean {
        const forgery = Array.from(this.falseMemories.values()).find(f => f.id === memoryId);
        if (forgery) return false;
        
        // Also check if memory has 'forged' tag
        const allMemories = recaller.recall({}, 1000);
        const memory = allMemories.find(m => m.id === memoryId);
        if (memory && memory.tags.includes('forged')) return false;
        
        return true;
    }
    
    setForgeryRate(rate: number): void {
        this.forgeryRate = Math.max(0, Math.min(0.3, rate));
    }
    
    activate(): void {
        this.isActive = true;
        console.log("Forger: Activated — false memories will be generated.");
    }
    
    deactivate(): void {
        this.isActive = false;
        console.log("Forger: Deactivated — false memory generation stopped.");
    }
    
    getStatistics(): object {
        return {
            active: this.isActive,
            forgeryRate: this.forgeryRate,
            totalForged: this.falseMemories.size,
            activeForgeries: Array.from(this.falseMemories.values()).filter(f => 
                f.confidence > 0.5
            ).length
        };
    }
    
    clear(): void {
        this.falseMemories.clear();
        console.log("Forger: All forgeries cleared.");
    }
}

export const forger = Forger.getInstance();
