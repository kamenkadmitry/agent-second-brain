import fs from 'fs/promises';
import path from 'path';
import matter from 'gray-matter';
import { logger } from '../../utils/logger.js';
import { env } from 'process';
export class VaultHealth {
    vaultPath;
    constructor() {
        const vp = env.VAULT_PATH || './vault';
        this.vaultPath = path.resolve(vp);
    }
    parseLinks(content) {
        // Find wikilinks like [[target]] or [[target|alias]]
        const links = [];
        const lines = content.split('\n');
        const linkRegex = /\[\[([^\]]+)\]\]/g;
        lines.forEach((line, idx) => {
            let match;
            while ((match = linkRegex.exec(line)) !== null) {
                const fullLink = match[1];
                let target = fullLink;
                // Deal with obsidian alias pipes | or escaped \|
                if (fullLink.includes('|')) {
                    target = fullLink.split('|')[0].replace(/\\/g, ''); // remove escapes
                }
                // Extract context: e.g. [[note]] — extends: deepens analysis
                const contextMatch = line.substring(match.index + match[0].length).match(/^\s*[-—]\s*(\w+):/);
                const context = contextMatch ? contextMatch[1] : null;
                links.push({
                    target: target.trim(),
                    context,
                    line: idx + 1
                });
            }
        });
        return links;
    }
    async analyze() {
        logger.info('Starting Vault Health Analysis');
        const files = [];
        const linkTargets = new Set();
        async function walk(dir) {
            const dirents = await fs.readdir(dir, { withFileTypes: true });
            for (const dirent of dirents) {
                const fullPath = path.join(dir, dirent.name);
                if (dirent.name.startsWith('.') || dirent.name.startsWith('node_modules'))
                    continue;
                if (dirent.isDirectory()) {
                    await walk(fullPath);
                }
                else if (dirent.isFile() && dirent.name.endsWith('.md')) {
                    const content = await fs.readFile(fullPath, 'utf-8');
                    // STRICT REQUIREMENT: Parse content, not name
                    const parsed = matter(content);
                    const data = parsed.data || {};
                    const isMOC = data.type === 'moc' || parsed.content.includes('dataview');
                    const hasDescription = !!data.description;
                    files.push({
                        path: fullPath,
                        links: [], // will parse below
                        hasDescription,
                        tier: data.tier,
                        isMOC
                    });
                }
            }
        }
        await walk(this.vaultPath);
        let totalLinks = 0;
        let missingDescriptions = 0;
        // Parse links after gathering all files
        for (const file of files) {
            const content = await fs.readFile(file.path, 'utf-8');
            const links = this.parseLinks(content);
            file.links = links;
            totalLinks += links.length;
            if (!file.hasDescription && !file.isMOC) {
                missingDescriptions++;
            }
            links.forEach(l => linkTargets.add(l.target));
        }
        // We need to map actual relative paths to see if target exists
        // simplified logic: collect all relative file paths (without .md)
        const validTargets = new Set();
        files.forEach(f => {
            const rel = path.relative(this.vaultPath, f.path);
            validTargets.add(rel.replace(/\.md$/, ''));
            // Also add basename just in case
            validTargets.add(path.basename(rel, '.md'));
        });
        let brokenLinks = 0;
        let deadEnds = 0;
        const incomingLinks = new Map();
        files.forEach(f => {
            const relPath = path.relative(this.vaultPath, f.path).replace(/\.md$/, '');
            let hasIncoming = false;
            f.links.forEach(l => {
                // Remove anchors
                const targetBase = l.target.split('#')[0];
                if (!validTargets.has(targetBase)) {
                    brokenLinks++;
                }
                else {
                    incomingLinks.set(targetBase, (incomingLinks.get(targetBase) || 0) + 1);
                }
            });
        });
        let orphans = 0;
        files.forEach(f => {
            const relPath = path.relative(this.vaultPath, f.path).replace(/\.md$/, '');
            const inCount = incomingLinks.get(relPath) || 0;
            const outCount = f.links.length;
            if (inCount === 0 && outCount === 0)
                orphans++;
            if (inCount === 0 && outCount > 0)
                deadEnds++;
        });
        const fileCount = files.length || 1;
        const orphanRatio = orphans / fileCount;
        const brokenRatio = brokenLinks / Math.max(totalLinks, 1);
        const avgLinks = totalLinks / fileCount;
        const descRatio = (fileCount - missingDescriptions) / fileCount;
        const healthScore = Math.max(0, 100
            - (orphanRatio * 30)
            - (brokenRatio * 30)
            - Math.max(0, (3 - avgLinks) * 15)
            - ((1 - descRatio) * 10));
        const result = {
            healthScore: Number(healthScore.toFixed(1)),
            totalFiles: fileCount,
            totalLinks,
            brokenLinks,
            orphans,
            deadEnds,
            avgLinks: Number(avgLinks.toFixed(2)),
            descRatio: Number(descRatio.toFixed(2))
        };
        logger.info(result, 'Vault Health Analyzed');
        return result;
    }
}
export const vaultHealth = new VaultHealth();
