import { describe, it, expect, vi } from 'vitest';
import { createMermaidStreamParser } from '../../src/utils/streamingParser';
import { extractMermaidFromFences, sanitizeMermaidLabels } from '../../src/utils/mermaidSanitizer';

describe('streaming parser', () => {
	it('collects fenced mermaid chunks and emits final on ```', () => {
		const partials: string[] = [];
		let final = '';
		const p = createMermaidStreamParser({
			onPartial: (s) => partials.push(s),
			onDone: (s) => (final = s),
		});

		p.append('Some preamble\n```mermaid\n');
		p.append('graph TD\nA-->B\n');
		expect(partials.at(-1)).toContain('graph TD');
		p.append('B-->C\n```\nTrailing');
		p.finish();
		expect(final.trim()).toContain('graph TD');
		expect(final.trim().endsWith('B-->C')).toBe(true);
	});

	it('detects raw mermaid start without fences', () => {
		let final = '';
		const p = createMermaidStreamParser({ onDone: (s) => (final = s) });
		p.append('Hello\nflowchart LR\nX-->Y');
		p.finish();
		expect(final.startsWith('flowchart LR')).toBe(true);
		expect(final.includes('X-->Y')).toBe(true);
	});
});

describe('mermaid sanitizer', () => {
	it('extracts from fences and keeps single diagram', () => {
		const txt = '```mermaid\nflowchart LR\nA-->B\n```\n```mermaid\nflowchart TB\nX-->Y\n```';
		const extracted = extractMermaidFromFences(txt);
		expect(extracted.startsWith('flowchart LR')).toBe(true);
	});

	it('quotes labels with parentheses', () => {
		const src = 'graph TD\nD[CDN (CloudFront)]';
		const sanitized = sanitizeMermaidLabels(src);
		expect(sanitized).toContain('D["CDN (CloudFront)"]');
	});

	it('quotes subgraph titles with punctuation', () => {
		const src = 'graph TD\nsubgraph Frontend (Global)\nA-->B\nend';
		const sanitized = sanitizeMermaidLabels(src);
		expect(sanitized).toMatch(/subgraph\s+"Frontend \(Global\)"/);
	});
});
