import { describe, expect, it } from 'vitest';
import {
  commentsToAttachments,
  liveSnapshotForComment,
  mergeAttachedComments,
  overlayBoundsFromSnapshot,
  removeAttachedComment,
  targetFromSnapshot,
} from './comments';
import type { PreviewComment } from './types';

describe('preview comment attachment helpers', () => {
  it('builds compact target context from an iframe snapshot', () => {
    const target = targetFromSnapshot({
      filePath: 'index.html',
      elementId: 'hero-title',
      selector: '[data-od-id="hero-title"]',
      label: 'h1.hero-title',
      text: `  ${'Title '.repeat(80)}  `,
      htmlHint: `<h1 class="hero-title" data-od-id="hero-title">${'x'.repeat(240)}</h1>`,
      position: { x: 10.4, y: 20.5, width: 300.2, height: 88.8 },
    });

    expect(target.text.length).toBeLessThanOrEqual(160);
    expect(target.htmlHint.length).toBeLessThanOrEqual(180);
    expect(target.position).toEqual({ x: 10, y: 21, width: 300, height: 89 });
  });

  it('creates ordered compact send payloads from attached comments', () => {
    const attachments = commentsToAttachments([
      comment({ id: 'c1', elementId: 'hero-title', note: 'Shorten this title' }),
      comment({ id: 'c2', elementId: 'chart', note: 'Make it feel real' }),
    ]);

    expect(attachments).toMatchObject([
      { id: 'c1', order: 1, elementId: 'hero-title', comment: 'Shorten this title' },
      { id: 'c2', order: 2, elementId: 'chart', comment: 'Make it feel real' },
    ]);
  });

  it('updates and removes attached comments by saved comment id', () => {
    const first = comment({ id: 'c1', elementId: 'hero-title', note: 'Original' });
    const updated = comment({ id: 'c1', elementId: 'hero-title', note: 'Updated' });
    const chart = comment({ id: 'c2', elementId: 'chart', note: 'Fix chart' });

    const merged = mergeAttachedComments([first, chart], updated);
    expect(merged).toHaveLength(2);
    expect(merged[0]?.note).toBe('Updated');

    const remaining = removeAttachedComment(merged, 'c1');
    expect(commentsToAttachments(remaining)).toEqual([
      expect.objectContaining({ id: 'c2', elementId: 'chart' }),
    ]);
  });

  it('converts iframe snapshot bounds into scaled overlay bounds', () => {
    expect(overlayBoundsFromSnapshot({
      filePath: 'index.html',
      elementId: 'hero-title',
      selector: '[data-od-id="hero-title"]',
      label: 'h1.hero-title',
      text: '',
      htmlHint: '',
      position: { x: 10, y: 20, width: 120, height: 40 },
    }, 1.25)).toEqual({
      left: 12.5,
      top: 25,
      width: 150,
      height: 50,
    });
  });

  it('only resolves saved markers from live snapshots for the same file', () => {
    const saved = comment({ filePath: 'index.html', elementId: 'hero-title' });
    const snapshots = new Map([
      ['hero-title', {
        filePath: 'index.html',
        elementId: 'hero-title',
        selector: '[data-od-id="hero-title"]',
        label: 'h1.hero-title',
        text: '',
        htmlHint: '',
        position: { x: 1, y: 2, width: 3, height: 4 },
      }],
    ]);

    expect(liveSnapshotForComment(saved, snapshots)?.elementId).toBe('hero-title');
    expect(liveSnapshotForComment(comment({ filePath: 'other.html' }), snapshots)).toBeNull();
  });
});

function comment(patch: Partial<PreviewComment>): PreviewComment {
  return {
    id: 'c1',
    projectId: 'project-1',
    conversationId: 'conversation-1',
    filePath: 'index.html',
    elementId: 'hero-title',
    selector: '[data-od-id="hero-title"]',
    label: 'h1.hero-title',
    text: 'Current title',
    position: { x: 1, y: 2, width: 3, height: 4 },
    htmlHint: '<h1 data-od-id="hero-title">',
    note: 'Comment',
    status: 'open',
    createdAt: 1,
    updatedAt: 1,
    ...patch,
  };
}
