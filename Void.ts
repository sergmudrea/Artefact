
// kernel/core/Void.ts
// Memory manager. Cleans not only RAM but also obsolete neural connections.

export class Void {
    private static instance: Void;
    private heap: Map<string, WeakRef<any>> = new Map();
    private generation: number = 0;

    private constructor() {
        this.startGarbageCollector();
    }

    static getInstance(): Void {
        if (!Void.instance) Void.instance = new Void();
        return Void.instance;
    }

    register(id: string, obj: any): void {
        this.heap.set(id, new WeakRef(obj));
    }

    unregister(id: string): void {
        this.heap.delete(id);
    }

    isAlive(id: string): boolean {
        const ref = this.heap.get(id);
        return ref !== undefined && ref.deref() !== undefined;
    }

    private startGarbageCollector(): void {
        setInterval(() => {
            let collected = 0;
            for (const [id, ref] of this.heap) {
                if (ref.deref() === undefined) {
                    this.heap.delete(id);
                    collected++;
                }
            }
            if (collected > 0) {
                console.log(`🜁 Void: ${collected} forgotten entities collected. Generation ${this.generation++}`);
            }
        }, 30000);
    }

    forceCollect(): void {
        if (global.gc) {
            global.gc();
            console.log("🜁 Void: forced collection. Silence.");
        }
    }
}
