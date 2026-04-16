import fs from 'fs/promises';
import path from 'path';
import matter from 'gray-matter';
import { logger } from '../../utils/logger.js';
import { env } from 'process';
const DEFAULT_CONFIG = {
    tiers: { active: 7, warm: 21, cold: 60 },
    decay_rate: 0.015,
    relevance_floor: 0.1,
    skip_patterns: ["_index.md"],
    type_inference: { "crm/": "crm", "leads/": "lead", "projects/": "project" },
    use_git_dates: true
};
const TODAY = new Date();
// Strip time
TODAY.setHours(0, 0, 0, 0);
function getDaysSince(dateString) {
    const d = new Date(dateString);
    if (isNaN(d.getTime()))
        return 0;
    d.setHours(0, 0, 0, 0);
    const diffTime = Math.abs(TODAY.getTime() - d.getTime());
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}
function calcRelevance(days, decayRate, floor) {
    const r = Math.exp(-decayRate * days);
    return Math.max(floor, Number(r.toFixed(3)));
}
function calcTier(days, tiers, currentTier) {
    if (currentTier === 'core')
        return 'core';
    if (days <= tiers.active)
        return 'active';
    if (days <= tiers.warm)
        return 'warm';
    if (days <= tiers.cold)
        return 'cold';
    return 'archive';
}
async function readConfigFile(dirPath) {
    const configPath = path.join(dirPath, '.memory-config.json');
    try {
        const content = await fs.readFile(configPath, 'utf-8');
        return JSON.parse(content);
    }
    catch (e) {
        if (e.code === 'ENOENT') {
            // Try searching up one level if not found, simplifying for now
            return DEFAULT_CONFIG;
        }
        logger.error({ error: e.message, path: configPath }, 'Failed to parse memory config');
        throw new Error(`Invalid memory config file: ${e.message}`);
    }
}
export class MemoryEngine {
    vaultPath;
    constructor() {
        const vp = env.VAULT_PATH || './vault';
        this.vaultPath = path.resolve(vp);
    }
    async getConfig(dirPath = this.vaultPath) {
        return readConfigFile(dirPath);
    }
    async findCards(targetDir, skipPatterns) {
        const cards = [];
        async function walk(dir) {
            const files = await fs.readdir(dir, { withFileTypes: true });
            for (const file of files) {
                const fullPath = path.join(dir, file.name);
                // Skip logic
                if (file.name.startsWith('.'))
                    continue;
                if (skipPatterns.some(pattern => file.name.includes(pattern)))
                    continue;
                if (file.isDirectory()) {
                    await walk(fullPath);
                }
                else if (file.isFile() && file.name.endsWith('.md')) {
                    cards.push(fullPath);
                }
            }
        }
        await walk(targetDir);
        return cards;
    }
    async scan(targetDir) {
        const dir = targetDir ? path.resolve(targetDir) : this.vaultPath;
        const config = await this.getConfig(dir);
        const cards = await this.findCards(dir, config.skip_patterns);
        let noYamlCount = 0;
        let totalSize = 0;
        for (const card of cards) {
            const content = await fs.readFile(card, 'utf-8');
            totalSize += Buffer.byteLength(content, 'utf8');
            // Check if file has YAML
            // Strict check based on content, not name
            if (!matter.test(content)) {
                noYamlCount++;
            }
        }
        logger.info({
            directory: dir,
            totalCards: cards.length,
            totalSizeKB: Math.round(totalSize / 1024),
            noYamlCount
        }, 'Memory Scan Results');
        return { cards: cards.length, size: totalSize, noYaml: noYamlCount };
    }
    async decay(targetDir, dryRun = false) {
        const dir = targetDir ? path.resolve(targetDir) : this.vaultPath;
        const config = await this.getConfig(dir);
        const cards = await this.findCards(dir, config.skip_patterns);
        const results = [];
        for (const card of cards) {
            const content = await fs.readFile(card, 'utf-8');
            const parsed = matter(content);
            const data = parsed.data || {};
            // Skip files without YAML or those explicitly marked core without dates
            if (Object.keys(data).length === 0)
                continue;
            const oldTier = data.tier || 'unknown';
            if (oldTier === 'core')
                continue; // Core doesn't decay automatically
            const lastAccessed = data.last_accessed;
            let days = 0;
            if (lastAccessed) {
                days = getDaysSince(lastAccessed);
            }
            else {
                // If no last_accessed, we could try mtime, but let's strictly require it to be there if it has YAML
                // according to strict policies, or throw.
                // But decay usually runs on initialized files.
                logger.warn({ card }, 'File missing last_accessed during decay');
                continue;
            }
            const newRelevance = calcRelevance(days, config.decay_rate, config.relevance_floor);
            const newTier = calcTier(days, config.tiers, oldTier);
            data.relevance = newRelevance;
            data.tier = newTier;
            const newContent = matter.stringify(parsed.content, data);
            if (content !== newContent) {
                if (!dryRun) {
                    await fs.writeFile(card, newContent, 'utf-8');
                }
                results.push({ card, oldTier, newTier, days, relevance: newRelevance });
            }
        }
        logger.info({ changedCards: results.length, dryRun }, 'Decay complete');
        return results;
    }
    async touch(filepath) {
        const absolutePath = path.resolve(filepath);
        const config = await this.getConfig(path.dirname(absolutePath));
        let content;
        try {
            content = await fs.readFile(absolutePath, 'utf-8');
        }
        catch (e) {
            logger.error({ error: e.message, filepath }, 'File not found for touch');
            throw new Error(`Cannot touch file: ${e.message}`);
        }
        const parsed = matter(content);
        const data = parsed.data || {};
        const currentTier = data.tier || 'archive';
        if (currentTier === 'core') {
            // Just refresh last_accessed
            data.last_accessed = TODAY.toISOString().split('T')[0];
            const newContent = matter.stringify(parsed.content, data);
            await fs.writeFile(absolutePath, newContent, 'utf-8');
            logger.info({ filepath, tier: 'core' }, 'Touched core file');
            return;
        }
        const coldThreshold = config.tiers.cold || 60;
        const warmThreshold = config.tiers.warm || 21;
        const activeThreshold = config.tiers.active || 7;
        let targetDays = 0;
        let newTier = 'active';
        if (currentTier === 'archive') {
            targetDays = Math.floor((warmThreshold + coldThreshold) / 2);
            newTier = 'cold';
        }
        else if (currentTier === 'cold') {
            targetDays = Math.floor((activeThreshold + warmThreshold) / 2);
            newTier = 'warm';
        }
        else if (currentTier === 'warm') {
            targetDays = Math.floor(activeThreshold / 2);
            newTier = 'active';
        }
        else {
            targetDays = 0;
            newTier = 'active';
        }
        const targetDate = new Date(TODAY);
        targetDate.setDate(targetDate.getDate() - targetDays);
        const newRelevance = calcRelevance(targetDays, config.decay_rate, config.relevance_floor);
        data.last_accessed = targetDate.toISOString().split('T')[0];
        data.relevance = newRelevance;
        data.tier = newTier;
        const newContent = matter.stringify(parsed.content, data);
        await fs.writeFile(absolutePath, newContent, 'utf-8');
        logger.info({ filepath, oldTier: currentTier, newTier, relevance: newRelevance }, 'Touched file');
    }
}
export const memoryEngine = new MemoryEngine();
