// kernel/echo/Recaller.ts
// Experience replay system. Stores and retrieves memories with decay.

import { Nexus } from '../core/Nexus';
import { Void } from '../core/Void';

export interface Memory {
    id: string;
    type: 'experience' | 'thought' | 'decision' | 'error';
    content: any;
    importance: number;      // 0-1, decays over time
    timestamp: number;
    lastAccessed: number;
    accessCount: number;
    tags: string[];
}

export class Recaller {
    private static instance: Recaller;
    private nexus: Nexus;
    private voidManager: Void;
    private memories: Map<string, Memory> = new Map();
    private episodicBuffer: Memory[] = [];
    private semanticBuffer: Memory[] = [];
    private bufferCapacity: number = 10000;
    private decayRate: number = 0.001;
    private consolidationInterval: NodeJS.Timeout | null = null;
    
    private constructor() {
        this.nexus = Nexus.getInstance();
        this.voidManager = Void.getInstance();
        this.startConsolidation();
    }
    
    static getInstance(): Recaller {
        if (!Recaller.instance) Recaller.instance = new Recaller();
        return Recaller.instance;
    }
    
    store(memory: Omit<Memory, 'id' | 'timestamp' | 'lastAccessed' | 'accessCount'>): string {
        const id = `mem_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
        const fullMemory: Memory = {
            ...memory,
            id,
            timestamp: Date.now(),
            lastAccessed: Date.now(),
            accessCount: 0
        };
        
        this.memories.set(id, fullMemory);
        this.episodicBuffer.push(fullMemory);
        
        if (this.episodicBuffer.length > this.bufferCapacity) {
            this.consolidate();
        }
        
        this.nexus.post({
            from: 'genetic',
            to: 'neural',
            type: 'thought',
            payload: { event: 'memory_stored', id, type: memory.type },
            timestamp: Date.now()
        });
        
        return id;
    }
    
    recall(query: Partial<Memory>, limit: number = 10): Memory[] {
        const results: Memory[] = [];
        
        for (const memory of this.memories.values()) {
            let matches = true;
            if (query.type && memory.type !== query.type) matches = false;
            if (query.tags && !query.tags.some(tag => memory.tags.includes(tag))) matches = false;
            if (query.importance && memory.importance < query.importance) matches = false;
            
            if (matches) {
                memory.lastAccessed = Date.now();
                memory.accessCount++;
                memory.importance *= (1 - this.decayRate);
                results.push(memory);
            }
        }
        
        // Sort by relevance (importance * recency)
        results.sort((a, b) => {
            const scoreA = a.importance * (1 - (Date.now() - a.timestamp) / 86400000);
            const scoreB = b.importance * (1 - (Date.now() - b.timestamp) / 86400000);
            return scoreB - scoreA;
        });
        
        return results.slice(0, limit);
    }
    
    recallByTimeRange(startTime: number, endTime: number): Memory[] {
        const results: Memory[] = [];
        for (const memory of this.memories.values()) {
            if (memory.timestamp >= startTime && memory.timestamp <= endTime) {
                results.push(memory);
            }
        }
        return results.sort((a, b) => b.timestamp - a.timestamp);
    }
    
    private consolidate(): void {
        // Move important episodic memories to semantic memory
        const sorted = [...this.episodicBuffer].sort((a, b) => b.importance - a.importance);
        const toKeep = sorted.slice(0, Math.floor(this.bufferCapacity * 0.7));
        const toConsolidate = sorted.slice(Math.floor(this.bufferCapacity * 0.7));
        
        for (const memory of toConsolidate) {
            if (memory.importance > 0.7) {
                this.semanticBuffer.push(memory);
            }
        }
        
        this.episodicBuffer = toKeep;
        
        if (this.semanticBuffer.length > this.bufferCapacity) {
            this.semanticBuffer = this.semanticBuffer.slice(-this.bufferCapacity);
        }
        
        console.log(`Recaller: Consolidated ${toConsolidate.length} memories. Semantic buffer: ${this.semanticBuffer.length}`);
    }
    
    private startConsolidation(): void {
        this.consolidationInterval = setInterval(() => {
            this.consolidate();
            this.applyDecay();
        }, 300000); // Every 5 minutes
    }
    
    private applyDecay(): void {
        for (const memory of this.memories.values()) {
            const age = Date.now() - memory.timestamp;
            const daysOld = age / 86400000;
            memory.importance *= Math.exp(-this.decayRate * daysOld);
            
            // Remove very old, unimportant memories
            if (memory.importance < 0.01 && age > 7 * 86400000) {
                this.memories.delete(memory.id);
            }
        }
    }
    
    getStatistics(): object {
        return {
            totalMemories: this.memories.size,
            episodicBufferSize: this.episodicBuffer.length,
            semanticBufferSize: this.semanticBuffer.length,
            decayRate: this.decayRate,
            bufferCapacity: this.bufferCapacity
        };
    }
    
    clear(): void {
        this.memories.clear();
        this.episodicBuffer = [];
        this.semanticBuffer = [];
        console.log("Recaller: All memories cleared.");
    }
}

export const recaller = Recaller.getInstance();
