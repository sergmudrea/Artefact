// kernel/core/Nexus.ts
// Synchronizes the three heads of the core: Neural, Symbolic, Genetic.

import { EventEmitter } from 'events';
import { Void } from './Void';

export interface NexusMessage {
    from: 'neural' | 'symbolic' | 'genetic';
    to: 'neural' | 'symbolic' | 'genetic' | 'all';
    type: 'mutation' | 'thought' | 'decision' | 'error';
    payload: any;
    timestamp: number;
}

export class Nexus extends EventEmitter {
    private static instance: Nexus;
    private messageQueue: NexusMessage[] = [];
    private isProcessing: boolean = false;
    private readonly voidManager = Void.getInstance();

    private constructor() {
        super();
        this.startProcessor();
    }

    static getInstance(): Nexus {
        if (!Nexus.instance) Nexus.instance = new Nexus();
        return Nexus.instance;
    }

    post(message: NexusMessage): void {
        this.messageQueue.push(message);
        this.voidManager.register(`msg_${message.timestamp}`, message);
    }

    private async startProcessor(): Promise<void> {
        while (true) {
            if (this.messageQueue.length > 0 && !this.isProcessing) {
                this.isProcessing = true;
                const msg = this.messageQueue.shift();
                if (msg) {
                    await this.dispatch(msg);
                }
                this.isProcessing = false;
            }
            await this.sleep(1);
        }
    }

    private async dispatch(msg: NexusMessage): Promise<void> {
        console.log(`Nexus: ${msg.from} → ${msg.to} : ${msg.type}`);
        this.emit(msg.to, msg);
        if (msg.to === 'all') {
            this.emit('neural', msg);
            this.emit('symbolic', msg);
            this.emit('genetic', msg);
        }
    }

    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
