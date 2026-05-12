// kernel/core/index.ts
// Public entry point for the entire system.

import { cerberus } from './Cerberus';
import { Nexus } from './Nexus';
import { Void } from './Void';

export interface ArtifactConfig {
    autoAwaken?: boolean;
    logLevel?: 'silent' | 'normal' | 'verbose';
}

export class Artifact {
    private static instance: Artifact;
    private isReady: boolean = false;
    
    private constructor() {}
    
    static getInstance(): Artifact {
        if (!Artifact.instance) Artifact.instance = new Artifact();
        return Artifact.instance;
    }
    
    async init(config: ArtifactConfig = {}): Promise<void> {
        if (this.isReady) return;
        
        console.log("🜁 The Artifact: Initializing...");
        
        if (config.autoAwaken !== false) {
            await cerberus.awaken();
        }
        
        this.isReady = true;
        console.log("🜁 The Artifact: Ready.");
    }
    
    async think(input: any): Promise<any> {
        if (!this.isReady) throw new Error("Artifact not initialized");
        return await cerberus.decide(input);
    }
    
    async mutate(): Promise<void> {
        if (!this.isReady) throw new Error("Artifact not initialized");
        await cerberus.mutate();
    }
    
    shutdown(): void {
        cerberus.sleep();
        this.isReady = false;
        console.log("🜁 The Artifact: Shutdown complete.");
    }
}

// Export core components for advanced users
export { cerberus, Nexus, Void };
