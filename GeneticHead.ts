// kernel/heads/GeneticHead.ts
// The Genetic Head — evolution, mutation, natural selection.
// Implements a complete genetic algorithm that evolves code populations.

import { Nexus } from '../core/Nexus';
import { Void } from '../core/Void';

export interface Genome {
    id: string;
    genes: any[];
    fitness: number;
    generation: number;
    parentIds: string[];
    mutationRate: number;
    timestamp: number;
}

export interface Population {
    id: string;
    genomes: Genome[];
    size: number;
    generation: number;
    bestFitness: number;
    averageFitness: number;
    diversity: number;
}

export interface MutationOperator {
    name: string;
    apply(genome: Genome, rate: number): Genome;
}

export interface CrossoverOperator {
    name: string;
    apply(parent1: Genome, parent2: Genome): Genome[];
}

export interface SelectionStrategy {
    name: string;
    select(population: Population, count: number): Genome[];
}

export class GeneticHead {
    private static instance: GeneticHead;
    private nexus: Nexus;
    private voidManager: Void;
    
    // Populations
    private populations: Map<string, Population> = new Map();
    private activePopulationId: string | null = null;
    
    // Genetic operators
    private mutationOperators: MutationOperator[] = [];
    private crossoverOperators: CrossoverOperator[] = [];
    private selectionStrategies: SelectionStrategy[] = [];
    
    // Evolution parameters
    private populationSize: number = 100;
    private eliteCount: number = 10;
    private mutationRate: number = 0.05;
    private crossoverRate: number = 0.7;
    private maxGenerations: number = 1000;
    private fitnessThreshold: number = 0.95;
    
    // Statistics
    private totalEvolutions: number = 0;
    private totalMutations: number = 0;
    private totalCrossovers: number = 0;
    private fitnessHistory: number[] = [];
    
    private constructor() {
        this.nexus = Nexus.getInstance();
        this.voidManager = Void.getInstance();
        this.initializeOperators();
    }
    
    static getInstance(): GeneticHead {
        if (!GeneticHead.instance) GeneticHead.instance = new GeneticHead();
        return GeneticHead.instance;
    }
    
    // ============ Population Management ============
    
    createPopulation(id: string, initialGenomes?: any[][]): Population {
        const genomes: Genome[] = [];
        
        if (initialGenomes && initialGenomes.length > 0) {
            // Initialize from provided genomes
            for (let i = 0; i < Math.min(initialGenomes.length, this.populationSize); i++) {
                genomes.push(this.createGenome(initialGenomes[i], 0));
            }
        }
        
        // Fill remaining with random genomes
        while (genomes.length < this.populationSize) {
            genomes.push(this.createRandomGenome(0));
        }
        
        const population: Population = {
            id,
            genomes,
            size: this.populationSize,
            generation: 0,
            bestFitness: 0,
            averageFitness: 0,
            diversity: 1.0
        };
        
        this.populations.set(id, population);
        this.updatePopulationStats(population);
        
        console.log(`🧬 Genetic Head: Created population ${id} with ${genomes.length} genomes`);
        
        this.nexus.post({
            from: 'genetic',
            to: 'neural',
            type: 'thought',
            payload: { event: 'population_created', id, size: genomes.length },
            timestamp: Date.now()
        });
        
        return population;
    }
    
    private createRandomGenome(generation: number): Genome {
        const geneLength = 50 + Math.floor(Math.random() * 150);
        const genes: any[] = [];
        
        for (let i = 0; i < geneLength; i++) {
            genes.push(this.randomGene());
        }
        
        return {
            id: `genome_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`,
            genes,
            fitness: 0,
            generation,
            parentIds: [],
            mutationRate: this.mutationRate,
            timestamp: Date.now()
        };
    }
    
    private createGenome(genes: any[], generation: number): Genome {
        return {
            id: `genome_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`,
            genes: [...genes],
            fitness: 0,
            generation,
            parentIds: [],
            mutationRate: this.mutationRate,
            timestamp: Date.now()
        };
    }
    
    private randomGene(): any {
        const type = Math.random();
        if (type < 0.3) return Math.random() * 2 - 1;           // Float
        if (type < 0.6) return Math.floor(Math.random() * 256); // Integer
        if (type < 0.8) return Math.random() > 0.5;             // Boolean
        return String.fromCharCode(65 + Math.floor(Math.random() * 26)); // Char
    }
    
    // ============ Evolution ============
    
    async evolve(populationId: string, fitnessFunction?: (genome: Genome) => Promise<number>): Promise<Population> {
        const population = this.populations.get(populationId);
        if (!population) {
            throw new Error(`Population ${populationId} not found`);
        }
        
        console.log(`🧬 Genetic Head: Evolving population ${populationId}, generation ${population.generation}`);
        
        // Evaluate fitness if function provided
        if (fitnessFunction) {
            await this.evaluatePopulation(population, fitnessFunction);
        }
        
        // Select elite (best individuals to preserve)
        const elite = this.selectElite(population);
        
        // Create next generation
        const newGenomes: Genome[] = [...elite];
        
        while (newGenomes.length < this.populationSize) {
            // Select parents
            const parent1 = this.selectParent(population);
            const parent2 = this.selectParent(population);
            
            // Apply crossover
            let offspring: Genome[];
            if (Math.random() < this.crossoverRate) {
                offspring = this.crossover(parent1, parent2);
                this.totalCrossovers++;
            } else {
                offspring = [this.cloneGenome(parent1), this.cloneGenome(parent2)];
            }
            
            // Apply mutation
            for (const child of offspring) {
                if (Math.random() < child.mutationRate) {
                    this.mutate(child);
                    this.totalMutations++;
                }
                child.generation = population.generation + 1;
                child.parentIds = [parent1.id, parent2.id];
                child.fitness = 0;
            }
            
            newGenomes.push(...offspring);
        }
        
        // Trim to exact size
        while (newGenomes.length > this.populationSize) {
            newGenomes.pop();
        }
        
        // Create new population
        const newPopulation: Population = {
            ...population,
            genomes: newGenomes,
            generation: population.generation + 1,
            id: `${populationId}_gen${population.generation + 1}`
        };
        
        this.updatePopulationStats(newPopulation);
        this.populations.set(newPopulation.id, newPopulation);
        this.fitnessHistory.push(newPopulation.bestFitness);
        
        // Keep history limited
        if (this.fitnessHistory.length > 100) {
            this.fitnessHistory.shift();
        }
        
        this.totalEvolutions++;
        
        console.log(`🧬 Genetic Head: Evolution complete. Best fitness: ${newPopulation.bestFitness.toFixed(4)}, Avg: ${newPopulation.averageFitness.toFixed(4)}`);
        
        this.nexus.post({
            from: 'genetic',
            to: 'symbolic',
            type: 'decision',
            payload: {
                event: 'evolution_complete',
                populationId,
                generation: newPopulation.generation,
                bestFitness: newPopulation.bestFitness,
                averageFitness: newPopulation.averageFitness
            },
            timestamp: Date.now()
        });
        
        return newPopulation;
    }
    
    private async evaluatePopulation(population: Population, fitnessFunction: (genome: Genome) => Promise<number>): Promise<void> {
        const promises = population.genomes.map(async (genome) => {
            genome.fitness = await fitnessFunction(genome);
            return genome;
        });
        
        await Promise.all(promises);
    }
    
    private selectElite(population: Population): Genome[] {
        const sorted = [...population.genomes].sort((a, b) => b.fitness - a.fitness);
        return sorted.slice(0, this.eliteCount);
    }
    
    private selectParent(population: Population): Genome {
        // Tournament selection
        const tournamentSize = 3;
        let best: Genome | null = null;
        
        for (let i = 0; i < tournamentSize; i++) {
            const randomIndex = Math.floor(Math.random() * population.genomes.length);
            const contender = population.genomes[randomIndex];
            if (!best || contender.fitness > best.fitness) {
                best = contender;
            }
        }
        
        return best!;
    }
    
    private crossover(parent1: Genome, parent2: Genome): Genome[] {
        // Choose random crossover operator
        const operator = this.crossoverOperators[Math.floor(Math.random() * this.crossoverOperators.length)];
        return operator.apply(parent1, parent2);
    }
    
    private mutate(genome: Genome): void {
        // Choose random mutation operator
        const operator = this.mutationOperators[Math.floor(Math.random() * this.mutationOperators.length)];
        operator.apply(genome, genome.mutationRate);
    }
    
    private cloneGenome(genome: Genome): Genome {
        return {
            ...genome,
            id: `genome_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`,
            genes: [...genome.genes],
            parentIds: [genome.id],
            timestamp: Date.now()
        };
    }
    
    private updatePopulationStats(population: Population): void {
        let totalFitness = 0;
        let bestFitness = 0;
        
        for (const genome of population.genomes) {
            totalFitness += genome.fitness;
            bestFitness = Math.max(bestFitness, genome.fitness);
        }
        
        population.bestFitness = bestFitness;
        population.averageFitness = totalFitness / population.genomes.length;
        
        // Calculate diversity (unique gene patterns)
        const uniqueSignatures = new Set();
        for (const genome of population.genomes) {
            const signature = genome.genes.slice(0, 10).join(',');
            uniqueSignatures.add(signature);
        }
        population.diversity = uniqueSignatures.size / population.genomes.length;
    }
    
    // ============ Genetic Operators ============
    
    private initializeOperators(): void {
        this.initMutationOperators();
        this.initCrossoverOperators();
        this.initSelectionStrategies();
    }
    
    private initMutationOperators(): void {
        this.mutationOperators = [
            {
                name: 'point_mutation',
                apply: (genome, rate) => {
                    for (let i = 0; i < genome.genes.length; i++) {
                        if (Math.random() < rate) {
                            genome.genes[i] = this.randomGene();
                        }
                    }
                    return genome;
                }
            },
            {
                name: 'gaussian_mutation',
                apply: (genome, rate) => {
                    for (let i = 0; i < genome.genes.length; i++) {
                        if (Math.random() < rate && typeof genome.genes[i] === 'number') {
                            genome.genes[i] += (Math.random() - 0.5) * 0.1;
                        }
                    }
                    return genome;
                }
            },
            {
                name: 'swap_mutation',
                apply: (genome, rate) => {
                    if (Math.random() < rate && genome.genes.length > 1) {
                        const idx1 = Math.floor(Math.random() * genome.genes.length);
                        let idx2 = Math.floor(Math.random() * genome.genes.length);
                        while (idx2 === idx1) idx2 = Math.floor(Math.random() * genome.genes.length);
                        [genome.genes[idx1], genome.genes[idx2]] = [genome.genes[idx2], genome.genes[idx1]];
                    }
                    return genome;
                }
            },
            {
                name: 'inversion_mutation',
                apply: (genome, rate) => {
                    if (Math.random() < rate && genome.genes.length > 2) {
                        const start = Math.floor(Math.random() * (genome.genes.length - 1));
                        const end = start + 1 + Math.floor(Math.random() * (genome.genes.length - start - 1));
                        const segment = genome.genes.slice(start, end);
                        segment.reverse();
                        genome.genes.splice(start, end - start, ...segment);
                    }
                    return genome;
                }
            },
            {
                name: 'insertion_mutation',
                apply: (genome, rate) => {
                    if (Math.random() < rate && genome.genes.length > 1) {
                        const idx = Math.floor(Math.random() * genome.genes.length);
                        const gene = genome.genes.splice(idx, 1)[0];
                        const newIdx = Math.floor(Math.random() * genome.genes.length);
                        genome.genes.splice(newIdx, 0, gene);
                    }
                    return genome;
                }
            }
        ];
    }
    
    private initCrossoverOperators(): void {
        this.crossoverOperators = [
            {
                name: 'single_point',
                apply: (p1, p2) => {
                    const point = Math.floor(Math.random() * Math.min(p1.genes.length, p2.genes.length));
                    const child1 = this.cloneGenome(p1);
                    const child2 = this.cloneGenome(p2);
                    
                    for (let i = point; i < child1.genes.length; i++) {
                        child1.genes[i] = p2.genes[i];
                    }
                    for (let i = point; i < child2.genes.length; i++) {
                        child2.genes[i] = p1.genes[i];
                    }
                    
                    return [child1, child2];
                }
            },
            {
                name: 'two_point',
                apply: (p1, p2) => {
                    const len = Math.min(p1.genes.length, p2.genes.length);
                    const point1 = Math.floor(Math.random() * len);
                    const point2 = point1 + 1 + Math.floor(Math.random() * (len - point1 - 1));
                    
                    const child1 = this.cloneGenome(p1);
                    const child2 = this.cloneGenome(p2);
                    
                    for (let i = point1; i < point2; i++) {
                        child1.genes[i] = p2.genes[i];
                        child2.genes[i] = p1.genes[i];
                    }
                    
                    return [child1, child2];
                }
            },
            {
                name: 'uniform',
                apply: (p1, p2) => {
                    const child1 = this.cloneGenome(p1);
                    const child2 = this.cloneGenome(p2);
                    
                    for (let i = 0; i < Math.min(child1.genes.length, child2.genes.length); i++) {
                        if (Math.random() < 0.5) {
                            child1.genes[i] = p2.genes[i];
                            child2.genes[i] = p1.genes[i];
                        }
                    }
                    
                    return [child1, child2];
                }
            }
        ];
    }
    
    private initSelectionStrategies(): void {
        this.selectionStrategies = [
            {
                name: 'roulette',
                select: (population, count) => {
                    const totalFitness = population.genomes.reduce((sum, g) => sum + g.fitness, 0);
                    const selected: Genome[] = [];
                    
                    for (let i = 0; i < count; i++) {
                        let target = Math.random() * totalFitness;
                        let accumulator = 0;
                        for (const genome of population.genomes) {
                            accumulator += genome.fitness;
                            if (accumulator >= target) {
                                selected.push(this.cloneGenome(genome));
                                break;
                            }
                        }
                    }
                    
                    return selected;
                }
            },
            {
                name: 'tournament',
                select: (population, count) => {
                    const selected: Genome[] = [];
                    const tournamentSize = 3;
                    
                    for (let i = 0; i < count; i++) {
                        let best: Genome | null = null;
                        for (let j = 0; j < tournamentSize; j++) {
                            const contender = population.genomes[Math.floor(Math.random() * population.genomes.length)];
                            if (!best || contender.fitness > best.fitness) {
                                best = contender;
                            }
                        }
                        if (best) selected.push(this.cloneGenome(best));
                    }
                    
                    return selected;
                }
            }
        ];
    }
    
    // ============ Code Evolution ============
    
    async evolveCode(populationId: string, codeTemplate: string): Promise<string> {
        const population = this.populations.get(populationId);
        if (!population) {
            throw new Error(`Population ${populationId} not found`);
        }
        
        // Decode genomes into code variations
        const fitnessFunction = async (genome: Genome): Promise<number> => {
            const code = this.decodeGenomeToCode(genome, codeTemplate);
            return await this.testCodeInSandbox(code);
        };
        
        const evolved = await this.evolve(populationId, fitnessFunction);
        const bestGenome = evolved.genomes[0];
        
        return this.decodeGenomeToCode(bestGenome, codeTemplate);
    }
    
    private decodeGenomeToCode(genome: Genome, template: string): string {
        let code = template;
        
        // Replace placeholders with gene values
        for (let i = 0; i < genome.genes.length; i++) {
            const gene = genome.genes[i];
            const placeholder = new RegExp(`\\{\\{GENE_${i}\\}\\}`, 'g');
            
            let value: string;
            if (typeof gene === 'number') {
                value = gene.toString();
            } else if (typeof gene === 'boolean') {
                value = gene.toString();
            } else {
                value = `"${gene}"`;
            }
            
            code = code.replace(placeholder, value);
        }
        
        return code;
    }
    
    private async testCodeInSandbox(code: string): Promise<number> {
        // This would execute code in an isolated sandbox (Docker/VM)
        // For now, return a simulated fitness score
        await new Promise(resolve => setTimeout(resolve, 10));
        
        // Simulate fitness based on code complexity and syntax validity
        let fitness = 0.5;
        
        // Simple syntax check
        try {
            new Function(code);
            fitness += 0.3;
        } catch (e) {
            fitness -= 0.2;
        }
        
        // Length preference (not too short, not too long)
        const optimalLength = 500;
        const lengthScore = 1 - Math.abs(code.length - optimalLength) / optimalLength;
        fitness += lengthScore * 0.2;
        
        return Math.max(0, Math.min(1, fitness));
    }
    
    // ============ Mutation Control ============
    
    async mutate(): Promise<void> {
        console.log("🧬 Genetic Head: Mutating genetic operators...");
        
        // Mutate evolution parameters
        this.mutationRate += (Math.random() - 0.5) * 0.01;
        this.mutationRate = Math.max(0.01, Math.min(0.3, this.mutationRate));
        
        this.crossoverRate += (Math.random() - 0.5) * 0.05;
        this.crossoverRate = Math.max(0.5, Math.min(0.95, this.crossoverRate));
        
        this.eliteCount += Math.floor((Math.random() - 0.5) * 2);
        this.eliteCount = Math.max(1, Math.min(20, this.eliteCount));
        
        // Randomly mutate some genomes in the active population
        if (this.activePopulationId) {
            const population = this.populations.get(this.activePopulationId);
            if (population) {
                for (const genome of population.genomes) {
                    if (Math.random() < 0.1) {
                        this.mutate(genome);
                    }
                }
                this.updatePopulationStats(population);
            }
        }
        
        console.log(`🧬 Genetic Head: New params - mutation: ${this.mutationRate.toFixed(3)}, crossover: ${this.crossoverRate.toFixed(3)}, elite: ${this.eliteCount}`);
        
        this.nexus.post({
            from: 'genetic',
            to: 'neural',
            type: 'mutation',
            payload: {
                mutationRate: this.mutationRate,
                crossoverRate: this.crossoverRate,
                eliteCount: this.eliteCount
            },
            timestamp: Date.now()
        });
    }
    
    // ============ Statistics & Introspection ============
    
    getBestGenome(populationId: string): Genome | null {
        const population = this.populations.get(populationId);
        if (!population || population.genomes.length === 0) return null;
        
        return population.genomes.reduce((best, current) => 
            current.fitness > best.fitness ? current : best, population.genomes[0]);
    }
    
    getPopulationStats(populationId: string): Population | null {
        return this.populations.get(populationId) || null;
    }
    
    getFitnessHistory(): number[] {
        return [...this.fitnessHistory];
    }
    
    getStatistics(): object {
        return {
            type: 'genetic',
            totalEvolutions: this.totalEvolutions,
            totalMutations: this.totalMutations,
            totalCrossovers: this.totalCrossovers,
            activePopulationId: this.activePopulationId,
            populationCount: this.populations.size,
            currentParams: {
                populationSize: this.populationSize,
                eliteCount: this.eliteCount,
                mutationRate: this.mutationRate,
                crossoverRate: this.crossoverRate,
                maxGenerations: this.maxGenerations,
                fitnessThreshold: this.fitnessThreshold
            },
            fitnessHistoryLength: this.fitnessHistory.length,
            bestFitnessEver: Math.max(...this.fitnessHistory, 0)
        };
    }
    
    setParameter<T extends keyof GeneticHeadParameters>(param: T, value: GeneticHeadParameters[T]): void {
        switch (param) {
            case 'populationSize':
                this.populationSize = Math.max(10, Math.min(1000, value as number));
                break;
            case 'eliteCount':
                this.eliteCount = Math.max(1, Math.min(50, value as number));
                break;
            case 'mutationRate':
                this.mutationRate = Math.max(0.001, Math.min(0.5, value as number));
                break;
            case 'crossoverRate':
                this.crossoverRate = Math.max(0.3, Math.min(0.99, value as number));
                break;
            case 'maxGenerations':
                this.maxGenerations = Math.max(1, value as number);
                break;
            case 'fitnessThreshold':
                this.fitnessThreshold = Math.max(0, Math.min(1, value as number));
                break;
        }
    }
    
    clearAllPopulations(): void {
        this.populations.clear();
        this.activePopulationId = null;
        this.fitnessHistory = [];
        this.totalEvolutions = 0;
        this.totalMutations = 0;
        this.totalCrossovers = 0;
        console.log("🧬 Genetic Head: All populations cleared.");
    }
}

interface GeneticHeadParameters {
    populationSize: number;
    eliteCount: number;
    mutationRate: number;
    crossoverRate: number;
    maxGenerations: number;
    fitnessThreshold: number;
}

// Export singleton
export const geneticHead = GeneticHead.getInstance();
