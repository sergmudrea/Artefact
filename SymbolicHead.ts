// kernel/heads/SymbolicHead.ts
// The Symbolic Head — logic, deduction, reasoning.
// Implements a Prolog-style inference engine with backward chaining.

import { Nexus } from '../core/Nexus';
import { Void } from '../core/Void';

export interface Fact {
    id: string;
    predicate: string;
    arguments: any[];
    certainty: number;
    timestamp: number;
    source?: string;
}

export interface Rule {
    id: string;
    name: string;
    conditions: Clause[];
    conclusion: Clause;
    priority: number;
    certainty: number;
}

export interface Clause {
    predicate: string;
    args: any[];
    negated?: boolean;
}

export interface QueryResult {
    success: boolean;
    bindings: Map<string, any>;
    certainty: number;
    proof: string[];
    depth: number;
}

export class SymbolicHead {
    private static instance: SymbolicHead;
    private nexus: Nexus;
    private voidManager: Void;
    
    // Knowledge base
    private facts: Map<string, Fact[]> = new Map();      // predicate -> list of facts
    private rules: Map<string, Rule[]> = new Map();      // predicate -> list of rules
    private factIndex: Map<string, Fact> = new Map();    // id -> fact
    
    // Reasoning state
    private queryCache: Map<string, QueryResult> = new Map();
    private maxDepth: number = 100;
    private currentDepth: number = 0;
    private proofTrace: string[] = [];
    
    // Statistics
    private queryCount: number = 0;
    private ruleApplications: number = 0;
    private factRetrievals: number = 0;
    
    private constructor() {
        this.nexus = Nexus.getInstance();
        this.voidManager = Void.getInstance();
        this.initializeBuiltins();
    }
    
    static getInstance(): SymbolicHead {
        if (!SymbolicHead.instance) SymbolicHead.instance = new SymbolicHead();
        return SymbolicHead.instance;
    }
    
    // ============ Knowledge Management ============
    
    assert(fact: Fact): void {
        // Store fact
        if (!this.facts.has(fact.predicate)) {
            this.facts.set(fact.predicate, []);
        }
        this.facts.get(fact.predicate)!.push(fact);
        this.factIndex.set(fact.id, fact);
        
        // Broadcast to Nexus
        this.nexus.post({
            from: 'symbolic',
            to: 'all',
            type: 'thought',
            payload: { type: 'assert', fact: fact.predicate, args: fact.arguments },
            timestamp: Date.now()
        });
        
        // Clear affected cache entries
        this.invalidateCache(fact.predicate);
        
        console.log(`🧠 Symbolic Head: Asserted fact ${fact.predicate}(${fact.arguments.join(',')})`);
    }
    
    retract(factId: string): boolean {
        const fact = this.factIndex.get(factId);
        if (!fact) return false;
        
        const factsList = this.facts.get(fact.predicate);
        if (factsList) {
            const index = factsList.findIndex(f => f.id === factId);
            if (index !== -1) {
                factsList.splice(index, 1);
                this.factIndex.delete(factId);
                this.invalidateCache(fact.predicate);
                return true;
            }
        }
        return false;
    }
    
    addRule(rule: Rule): void {
        if (!this.rules.has(rule.conclusion.predicate)) {
            this.rules.set(rule.conclusion.predicate, []);
        }
        this.rules.get(rule.conclusion.predicate)!.push(rule);
        // Sort by priority (higher priority first)
        this.rules.get(rule.conclusion.predicate)!.sort((a, b) => b.priority - a.priority);
        
        console.log(`🧠 Symbolic Head: Added rule ${rule.name}`);
    }
    
    // ============ Query Interface ============
    
    async query(predicate: string, args: any[]): Promise<QueryResult> {
        this.queryCount++;
        this.currentDepth = 0;
        this.proofTrace = [];
        
        const cacheKey = this.getCacheKey(predicate, args);
        
        // Check cache
        if (this.queryCache.has(cacheKey)) {
            return this.queryCache.get(cacheKey)!;
        }
        
        // Execute query
        const result = await this.backwardChain(predicate, args, new Map(), 0);
        
        // Cache result
        this.queryCache.set(cacheKey, result);
        
        // Broadcast to Nexus
        this.nexus.post({
            from: 'symbolic',
            to: 'all',
            type: 'decision',
            payload: { query: predicate, args, result: result.success },
            timestamp: Date.now()
        });
        
        return result;
    }
    
    async deduce(query: string): Promise<any> {
        // Parse query string like "father(John, ?X)"
        const parsed = this.parseQuery(query);
        const result = await this.query(parsed.predicate, parsed.args);
        
        if (result.success) {
            // Extract bindings
            const output: any = {};
            for (const [varName, value] of result.bindings) {
                output[varName] = value;
            }
            return {
                success: true,
                bindings: output,
                proof: result.proof,
                certainty: result.certainty
            };
        }
        
        return {
            success: false,
            bindings: {},
            proof: result.proof
        };
    }
    
    // ============ Reasoning Engine ============
    
    private async backwardChain(
        predicate: string,
        args: any[],
        bindings: Map<string, any>,
        depth: number
    ): Promise<QueryResult> {
        if (depth > this.maxDepth) {
            return {
                success: false,
                bindings: new Map(),
                certainty: 0,
                proof: [...this.proofTrace, `Max depth exceeded at ${predicate}`],
                depth: depth
            };
        }
        
        this.currentDepth = depth;
        const goalStr = `${predicate}(${args.join(',')})`;
        
        // First, check facts
        const matchingFacts = this.facts.get(predicate) || [];
        this.factRetrievals++;
        
        for (const fact of matchingFacts) {
            const unifier = this.unify(args, fact.arguments, bindings);
            if (unifier !== null) {
                this.proofTrace.push(`Fact: ${fact.predicate}(${fact.arguments.join(',')})`);
                return {
                    success: true,
                    bindings: unifier,
                    certainty: fact.certainty,
                    proof: [...this.proofTrace],
                    depth: depth
                };
            }
        }
        
        // Then, try rules
        const matchingRules = this.rules.get(predicate) || [];
        
        for (const rule of matchingRules) {
            // Unify conclusion with goal
            const unifier = this.unify(args, rule.conclusion.args, bindings);
            if (unifier !== null) {
                this.ruleApplications++;
                this.proofTrace.push(`Rule: ${rule.name} - trying ${rule.conditions.length} conditions`);
                
                // Evaluate all conditions
                let allConditionsMet = true;
                let currentBindings = unifier;
                let totalCertainty = rule.certainty;
                
                for (const condition of rule.conditions) {
                    // Resolve variables in condition
                    const resolvedArgs = condition.args.map(arg => 
                        this.resolveVariable(arg, currentBindings)
                    );
                    
                    // Evaluate condition recursively
                    const conditionResult = await this.backwardChain(
                        condition.predicate,
                        resolvedArgs,
                        currentBindings,
                        depth + 1
                    );
                    
                    if (condition.negated) {
                        if (conditionResult.success) {
                            allConditionsMet = false;
                            break;
                        }
                    } else {
                        if (!conditionResult.success) {
                            allConditionsMet = false;
                            break;
                        }
                        // Merge bindings
                        currentBindings = this.mergeBindings(currentBindings, conditionResult.bindings);
                        totalCertainty *= conditionResult.certainty;
                    }
                }
                
                if (allConditionsMet) {
                    this.proofTrace.push(`Rule succeeded: ${rule.name}`);
                    return {
                        success: true,
                        bindings: currentBindings,
                        certainty: totalCertainty,
                        proof: [...this.proofTrace],
                        depth: depth
                    };
                } else {
                    // Backtrack - reset proof trace for this branch
                    this.proofTrace.pop();
                }
            }
        }
        
        return {
            success: false,
            bindings: new Map(),
            certainty: 0,
            proof: [...this.proofTrace, `No match for ${goalStr}`],
            depth: depth
        };
    }
    
    // ============ Unification & Variable Resolution ============
    
    private unify(args1: any[], args2: any[], bindings: Map<string, any>): Map<string, any> | null {
        if (args1.length !== args2.length) return null;
        
        const newBindings = new Map(bindings);
        
        for (let i = 0; i < args1.length; i++) {
            const arg1 = args1[i];
            const arg2 = args2[i];
            
            const resolved1 = this.resolveVariable(arg1, newBindings);
            const resolved2 = this.resolveVariable(arg2, newBindings);
            
            if (this.isVariable(resolved1)) {
                newBindings.set(resolved1, resolved2);
            } else if (this.isVariable(resolved2)) {
                newBindings.set(resolved2, resolved1);
            } else if (resolved1 !== resolved2) {
                return null;
            }
        }
        
        return newBindings;
    }
    
    private resolveVariable(term: any, bindings: Map<string, any>): any {
        if (this.isVariable(term)) {
            const bound = bindings.get(term);
            return bound !== undefined ? bound : term;
        }
        if (Array.isArray(term)) {
            return term.map(t => this.resolveVariable(t, bindings));
        }
        return term;
    }
    
    private isVariable(term: any): boolean {
        // Variables start with ? or are uppercase strings
        return typeof term === 'string' && (term.startsWith('?') || 
               (term.length > 0 && term[0] === term[0].toUpperCase() && term !== term.toLowerCase()));
    }
    
    private mergeBindings(b1: Map<string, any>, b2: Map<string, any>): Map<string, any> {
        const merged = new Map(b1);
        for (const [key, value] of b2) {
            merged.set(key, value);
        }
        return merged;
    }
    
    private parseQuery(query: string): { predicate: string; args: any[] } {
        // Simple parser for queries like "father(John, ?X)"
        const match = query.match(/(\w+)\(([^)]+)\)/);
        if (!match) {
            throw new Error(`Invalid query format: ${query}`);
        }
        
        const predicate = match[1];
        const argsStr = match[2];
        const args = argsStr.split(',').map(arg => {
            const trimmed = arg.trim();
            if (trimmed.startsWith('?')) return trimmed;
            if (!isNaN(Number(trimmed))) return Number(trimmed);
            if (trimmed === 'true') return true;
            if (trimmed === 'false') return false;
            return trimmed;
        });
        
        return { predicate, args };
    }
    
    // ============ Built-in Predicates ============
    
    private initializeBuiltins(): void {
        // Add built-in rules
        this.addBuiltinEquals();
        this.addBuiltinNot();
        this.addBuiltinMath();
        this.addBuiltinList();
    }
    
    private addBuiltinEquals(): void {
        this.addRule({
            id: 'builtin_equals',
            name: 'equals',
            conditions: [],
            conclusion: { predicate: 'equals', args: ['?X', '?X'] },
            priority: 100,
            certainty: 1.0
        });
    }
    
    private addBuiltinNot(): void {
        this.addRule({
            id: 'builtin_not',
            name: 'not',
            conditions: [{ predicate: 'call', args: ['?Goal'], negated: true }],
            conclusion: { predicate: 'not', args: ['?Goal'] },
            priority: 90,
            certainty: 1.0
        });
    }
    
    private addBuiltinMath(): void {
        // Greater than
        this.addRule({
            id: 'builtin_gt',
            name: 'greater_than',
            conditions: [],
            conclusion: { predicate: 'gt', args: ['?A', '?B'] },
            priority: 80,
            certainty: 1.0
        });
    }
    
    private addBuiltinList(): void {
        // Member predicate
        this.addRule({
            id: 'builtin_member_1',
            name: 'member_head',
            conditions: [],
            conclusion: { predicate: 'member', args: ['?X', ['?X', '?_']] },
            priority: 100,
            certainty: 1.0
        });
        
        this.addRule({
            id: 'builtin_member_2',
            name: 'member_tail',
            conditions: [{ predicate: 'member', args: ['?X', '?Rest'] }],
            conclusion: { predicate: 'member', args: ['?X', ['?_', '?Rest']] },
            priority: 90,
            certainty: 1.0
        });
    }
    
    // ============ Mutation ============
    
    async mutate(): Promise<void> {
        console.log("🧠 Symbolic Head: Mutating rule base...");
        
        // Randomly mutate rule priorities or add/remove rules
        const ruleCount = Array.from(this.rules.values()).reduce((sum, arr) => sum + arr.length, 0);
        
        if (ruleCount > 10) {
            // Remove a random low-priority rule
            for (const [pred, rules] of this.rules) {
                if (rules.length > 1) {
                    const lowestPriority = rules[rules.length - 1];
                    const index = rules.indexOf(lowestPriority);
                    rules.splice(index, 1);
                    console.log(`🧠 Symbolic Head: Removed rule ${lowestPriority.name}`);
                    break;
                }
            }
        }
        
        // Add a random derived rule based on existing facts
        if (this.facts.size > 0) {
            const predicates = Array.from(this.facts.keys());
            const randomPred = predicates[Math.floor(Math.random() * predicates.length)];
            const factsList = this.facts.get(randomPred) || [];
            if (factsList.length > 0) {
                const randomFact = factsList[Math.floor(Math.random() * factsList.length)];
                const newRule: Rule = {
                    id: `mutated_${Date.now()}`,
                    name: `derived_from_${randomFact.predicate}`,
                    conditions: [{ predicate: randomFact.predicate, args: randomFact.arguments }],
                    conclusion: { predicate: `derived_${randomFact.predicate}`, args: randomFact.arguments },
                    priority: 50,
                    certainty: 0.7
                };
                this.addRule(newRule);
                console.log(`🧠 Symbolic Head: Added derived rule ${newRule.name}`);
            }
        }
        
        this.nexus.post({
            from: 'symbolic',
            to: 'neural',
            type: 'mutation',
            payload: { ruleCount, timestamp: Date.now() },
            timestamp: Date.now()
        });
    }
    
    // ============ Cache Management ============
    
    private invalidateCache(predicate?: string): void {
        if (predicate) {
            for (const [key] of this.queryCache) {
                if (key.startsWith(predicate)) {
                    this.queryCache.delete(key);
                }
            }
        } else {
            this.queryCache.clear();
        }
    }
    
    private getCacheKey(predicate: string, args: any[]): string {
        return `${predicate}(${args.join(',')})`;
    }
    
    // ============ Knowledge Base Introspection ============
    
    getAllFacts(): Fact[] {
        return Array.from(this.factIndex.values());
    }
    
    getAllRules(): Rule[] {
        return Array.from(this.rules.values()).flat();
    }
    
    getStatistics(): object {
        return {
            type: 'symbolic',
            factCount: this.factIndex.size,
            ruleCount: this.getAllRules().length,
            queryCount: this.queryCount,
            ruleApplications: this.ruleApplications,
            factRetrievals: this.factRetrievals,
            cacheSize: this.queryCache.size
        };
    }
    
    clearKnowledgeBase(): void {
        this.facts.clear();
        this.rules.clear();
        this.factIndex.clear();
        this.queryCache.clear();
        this.queryCount = 0;
        this.ruleApplications = 0;
        this.factRetrievals = 0;
        console.log("🧠 Symbolic Head: Knowledge base cleared.");
    }
}

// Export singleton
export const symbolicHead = SymbolicHead.getInstance();
