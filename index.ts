// kernel/heads/index.ts
// Export all three heads (Neural, Symbolic, Genetic)

export { NeuralHead, neuralHead } from './NeuralHead';
// export { SymbolicHead, symbolicHead } from './SymbolicHead'; // Step 4
// export { GeneticHead, geneticHead } from './GeneticHead';     // Step 5

export interface Head {
    think(input: any): Promise<any>;
    learn(experience: any): Promise<void>;
    mutate(): Promise<void>;
}

export type HeadType = 'neural' | 'symbolic' | 'genetic';
