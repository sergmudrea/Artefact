// kernel/hive/Selector.ts
// Natural selection for evolved code populations.

import { Genome, Population } from '../heads/GeneticHead';

export interface SelectionResult {
    selected: Genome[];
    rejected: Genome[];
    selectionPressure: number;
}

export class Selector {
    private static instance: Selector;
    
    private constructor() {}
    
    static getInstance(): Selector {
        if (!Selector.instance) Selector.instance = new Selector();
        return Selector.instance;
    }
    
    selectElite(population: Population, count: number): Genome[] {
        return [...population.genomes]
            .sort((a, b) => b.fitness - a.fitness)
            .slice(0, count);
    }
    
    selectTournament(population: Population, tournamentSize: number, count: number): Genome[] {
        const selected: Genome[] = [];
        
        for (let i = 0; i < count; i++) {
            let best: Genome | null = null;
            for (let j = 0; j < tournamentSize; j++) {
                const contender = population.genomes[Math.floor(Math.random() * population.genomes.length)];
                if (!best || contender.fitness > best.fitness) {
                    best = contender;
                }
            }
            if (best) selected.push(best);
        }
        
        return selected;
    }
    
    selectRoulette(population: Population, count: number): Genome[] {
        const totalFitness = population.genomes.reduce((sum, g) => sum + g.fitness, 0);
        const selected: Genome[] = [];
        
        for (let i = 0; i < count; i++) {
            let target = Math.random() * totalFitness;
            let accumulated = 0;
            
            for (const genome of population.genomes) {
                accumulated += genome.fitness;
                if (accumulated >= target) {
                    selected.push(genome);
                    break;
                }
            }
        }
        
        return selected;
    }
    
    selectRankBased(population: Population, count: number): Genome[] {
        const sorted = [...population.genomes].sort((a, b) => b.fitness - a.fitness);
        const ranks = sorted.map((_, idx) => sorted.length - idx);
        const totalRank = ranks.reduce((sum, r) => sum + r, 0);
        const selected: Genome[] = [];
        
        for (let i = 0; i < count; i++) {
            let target = Math.random() * totalRank;
            let accumulated = 0;
            
            for (let j = 0; j < sorted.length; j++) {
                accumulated += ranks[j];
                if (accumulated >= target) {
                    selected.push(sorted[j]);
                    break;
                }
            }
        }
        
        return selected;
    }
    
    selectStochasticUniversal(population: Population, count: number): Genome[] {
        const totalFitness = population.genomes.reduce((sum, g) => sum + g.fitness, 0);
        const step = totalFitness / count;
        const start = Math.random() * step;
        const selected: Genome[] = [];
        let currentPointer = start;
        let currentIndex = 0;
        let accumulated = 0;
        
        for (let i = 0; i < count; i++) {
            while (currentPointer > accumulated && currentIndex < population.genomes.length) {
                accumulated += population.genomes[currentIndex].fitness;
                currentIndex++;
            }
            selected.push(population.genomes[currentIndex - 1]);
            currentPointer += step;
        }
        
        return selected;
    }
    
    truncate(population: Population, maxSize: number): Population {
        const truncated = {
            ...population,
            genomes: this.selectElite(population, maxSize),
            size: maxSize
        };
        return truncated;
    }
}

export const selector = Selector.getInstance();
