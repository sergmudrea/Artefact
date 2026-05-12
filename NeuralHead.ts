// kernel/heads/NeuralHead.ts
// The Neural Head — intuition, pattern recognition, deep learning.
// Implements a hybrid LSTM + Transformer architecture for sequence modeling.

import * as tf from '@tensorflow/tfjs-node';
import { Nexus } from '../core/Nexus';
import { Void } from '../core/Void';

export interface NeuralConfig {
    inputDim: number;
    hiddenDim: number;
    outputDim: number;
    lstmUnits: number;
    attentionHeads: number;
    dropoutRate: number;
    learningRate: number;
}

export interface MemoryState {
    hiddenState: tf.Tensor | null;
    cellState: tf.Tensor | null;
    attentionWeights: tf.Tensor | null;
    shortTerm: any[];
    longTerm: any[];
}

export class NeuralHead {
    private static instance: NeuralHead;
    private nexus: Nexus;
    private voidManager: Void;
    private config: NeuralConfig;
    
    // Neural network layers
    private lstm: tf.Layer | null = null;
    private attention: tf.Layer | null = null;
    private dense: tf.Layer | null = null;
    private optimizer: tf.Optimizer | null = null;
    
    // State
    private memory: MemoryState;
    private isTraining: boolean = false;
    private experienceBuffer: any[] = [];
    private bufferSize: number = 1000;
    private epochCount: number = 0;
    
    private constructor() {
        this.nexus = Nexus.getInstance();
        this.voidManager = Void.getInstance();
        this.config = this.getDefaultConfig();
        this.memory = this.initMemory();
        this.buildNetwork();
    }
    
    static getInstance(): NeuralHead {
        if (!NeuralHead.instance) NeuralHead.instance = new NeuralHead();
        return NeuralHead.instance;
    }
    
    private getDefaultConfig(): NeuralConfig {
        return {
            inputDim: 128,
            hiddenDim: 256,
            outputDim: 128,
            lstmUnits: 64,
            attentionHeads: 8,
            dropoutRate: 0.2,
            learningRate: 0.001
        };
    }
    
    private initMemory(): MemoryState {
        return {
            hiddenState: null,
            cellState: null,
            attentionWeights: null,
            shortTerm: [],
            longTerm: []
        };
    }
    
    private buildNetwork(): void {
        // Input layer
        const input = tf.input({ shape: [null, this.config.inputDim] });
        
        // LSTM layer for temporal dependencies
        const lstmOutput = tf.layers.lstm({
            units: this.config.lstmUnits,
            returnSequences: true,
            dropout: this.config.dropoutRate,
            recurrentDropout: this.config.dropoutRate
        }).apply(input);
        
        // Self-attention mechanism
        const attentionOutput = tf.layers.multiHeadAttention({
            numHeads: this.config.attentionHeads,
            keyDim: this.config.hiddenDim,
            dropout: this.config.dropoutRate
        }).apply([lstmOutput, lstmOutput, lstmOutput]);
        
        // Residual connection
        const residual = tf.layers.add().apply([lstmOutput, attentionOutput]);
        
        // Layer normalization
        const norm = tf.layers.layerNormalization().apply(residual);
        
        // Dense output layer
        const output = tf.layers.dense({
            units: this.config.outputDim,
            activation: 'tanh'
        }).apply(norm);
        
        // Create model
        const model = tf.model({ inputs: input, outputs: output });
        
        // Compile with Adam optimizer
        this.optimizer = tf.train.adam(this.config.learningRate);
        model.compile({
            optimizer: this.optimizer,
            loss: 'meanSquaredError',
            metrics: ['accuracy']
        });
        
        this.lstm = tf.layers.lstm({ units: this.config.lstmUnits });
        this.attention = tf.layers.multiHeadAttention({ numHeads: this.config.attentionHeads, keyDim: this.config.hiddenDim });
        this.dense = tf.layers.dense({ units: this.config.outputDim });
        
        console.log("🧠 Neural Head: Network architecture built.");
    }
    
    // Core methods
    async think(input: any): Promise<any> {
        try {
            // Convert input to tensor
            const inputTensor = this.preprocess(input);
            
            // Forward pass through LSTM
            const lstmResult = await this.lstmForward(inputTensor);
            
            // Apply attention mechanism
            const attentionResult = await this.applyAttention(lstmResult);
            
            // Generate output
            const output = await this.generateOutput(attentionResult);
            
            // Update short-term memory
            this.updateMemory(input, output);
            
            // Broadcast thought to Nexus
            this.nexus.post({
                from: 'neural',
                to: 'all',
                type: 'thought',
                payload: { input, output, confidence: this.calculateConfidence(attentionResult) },
                timestamp: Date.now()
            });
            
            return output;
        } catch (error) {
            console.error("Neural Head think error:", error);
            return this.fallbackThink(input);
        }
    }
    
    async learn(experience: any): Promise<void> {
        this.experienceBuffer.push(experience);
        
        if (this.experienceBuffer.length >= this.bufferSize) {
            await this.train();
            this.experienceBuffer = [];
        }
    }
    
    async train(): Promise<void> {
        if (this.isTraining || this.experienceBuffer.length === 0) return;
        
        this.isTraining = true;
        
        try {
            // Prepare training data
            const inputs: tf.Tensor[] = [];
            const targets: tf.Tensor[] = [];
            
            for (const exp of this.experienceBuffer) {
                inputs.push(this.preprocess(exp.input));
                targets.push(this.preprocess(exp.output));
            }
            
            const inputTensor = tf.stack(inputs);
            const targetTensor = tf.stack(targets);
            
            // Train for one epoch
            const result = await (this.lstm as any).fit(inputTensor, targetTensor, {
                epochs: 1,
                batchSize: 32,
                verbose: false
            });
            
            this.epochCount++;
            
            console.log(`🧠 Neural Head: Trained on ${this.experienceBuffer.length} experiences. Epoch ${this.epochCount}`);
            
            // Clean up
            inputTensor.dispose();
            targetTensor.dispose();
            
        } catch (error) {
            console.error("Neural Head training error:", error);
        } finally {
            this.isTraining = false;
        }
    }
    
    async mutate(): Promise<void> {
        console.log("🧠 Neural Head: Mutating synaptic weights...");
        
        // Apply random mutations to weights
        const layers = [this.lstm, this.attention, this.dense].filter(l => l !== null);
        
        for (const layer of layers) {
            const weights = layer?.getWeights();
            if (weights) {
                const mutatedWeights = weights.map(w => {
                    const noise = tf.randomNormal(w.shape, 0, 0.05);
                    return w.add(noise);
                });
                layer?.setWeights(mutatedWeights);
            }
        }
        
        console.log("🧠 Neural Head: Mutation complete.");
        
        this.nexus.post({
            from: 'neural',
            to: 'genetic',
            type: 'mutation',
            payload: { epoch: this.epochCount },
            timestamp: Date.now()
        });
    }
    
    // Private helper methods
    private preprocess(input: any): tf.Tensor {
        // Convert various input types to tensor
        if (input instanceof tf.Tensor) return input;
        
        if (typeof input === 'number') {
            return tf.tensor2d([[input]], [1, 1]);
        }
        
        if (Array.isArray(input)) {
            return tf.tensor2d([input], [1, input.length]);
        }
        
        if (typeof input === 'string') {
            // Simple string encoding placeholder
            const encoded = input.split('').map(c => c.charCodeAt(0) / 255);
            return tf.tensor2d([encoded], [1, encoded.length]);
        }
        
        if (typeof input === 'object') {
            const values = Object.values(input);
            const numeric = values.map(v => typeof v === 'number' ? v : 0);
            return tf.tensor2d([numeric], [1, numeric.length]);
        }
        
        return tf.tensor2d([[0]], [1, 1]);
    }
    
    private async lstmForward(input: tf.Tensor): Promise<tf.Tensor> {
        if (!this.lstm) return input;
        return this.lstm.apply(input) as tf.Tensor;
    }
    
    private async applyAttention(input: tf.Tensor): Promise<tf.Tensor> {
        if (!this.attention) return input;
        return this.attention.apply([input, input, input]) as tf.Tensor;
    }
    
    private async generateOutput(attentionResult: tf.Tensor): Promise<any> {
        if (!this.dense) return attentionResult;
        
        const output = this.dense.apply(attentionResult) as tf.Tensor;
        const data = await output.data();
        output.dispose();
        
        // Convert tensor to JavaScript object
        return { 
            value: Array.from(data),
            shape: output.shape,
            source: 'neural'
        };
    }
    
    private updateMemory(input: any, output: any): void {
        this.memory.shortTerm.push({ input, output, timestamp: Date.now() });
        
        // Keep only last 100 short-term memories
        if (this.memory.shortTerm.length > 100) {
            const oldest = this.memory.shortTerm.shift();
            if (oldest) {
                this.memory.longTerm.push(oldest);
            }
        }
        
        // Keep last 1000 long-term memories
        if (this.memory.longTerm.length > 1000) {
            this.memory.longTerm.shift();
        }
    }
    
    private calculateConfidence(attentionResult: tf.Tensor): number {
        // Simplified confidence calculation
        const sum = attentionResult.sum().dataSync()[0];
        const size = attentionResult.size;
        return Math.min(0.95, Math.max(0.5, sum / size));
    }
    
    private fallbackThink(input: any): any {
        return {
            fallback: true,
            input: input,
            output: "Neural head temporarily unavailable",
            source: 'neural'
        };
    }
    
    // Memory introspection
    async recallShortTerm(): Promise<any[]> {
        return [...this.memory.shortTerm];
    }
    
    async recallLongTerm(): Promise<any[]> {
        return [...this.memory.longTerm];
    }
    
    async clearMemory(): Promise<void> {
        this.memory = this.initMemory();
        this.experienceBuffer = [];
        console.log("🧠 Neural Head: Memory cleared.");
    }
    
    // Get status
    getStatus(): object {
        return {
            type: 'neural',
            architecture: 'LSTM + Transformer',
            training: this.isTraining,
            bufferSize: this.experienceBuffer.length,
            epochCount: this.epochCount,
            shortTermSize: this.memory.shortTerm.length,
            longTermSize: this.memory.longTerm.length
        };
    }
}

// Export singleton
export const neuralHead = NeuralHead.getInstance();
