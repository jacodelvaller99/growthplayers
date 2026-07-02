/**
 * Render smoke test del CommentSheet + EmojiReactionBar (El Círculo F4).
 * CommentSheet: lista poblada + composer + reportar/borrar según autor.
 * EmojiReactionBar: grupos con conteo + mi reacción marcada.
 */
import { render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';

jest.mock('@/components/Avatar', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const RN = require('react-native');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const R = require('react');
  return { Avatar: () => R.createElement(RN.View) };
});
jest.mock('@/lib/circle', () => ({
  fetchComments: jest.fn().mockResolvedValue([
    { id: 'c1', post_id: 'p1', user_id: 'me', content: 'Gran reflexión.', created_at: '2026-06-30T10:00:00Z', author_name: 'Yo', author_avatar: null },
    { id: 'c2', post_id: 'p1', user_id: 'u2', content: 'De acuerdo, hermano.', created_at: '2026-06-30T11:00:00Z', author_name: 'Beto', author_avatar: null },
  ]),
  fetchBlockedIds: jest.fn().mockResolvedValue(new Set()),
  addComment: jest.fn().mockResolvedValue({ success: true, id: 'c3' }),
  deleteComment: jest.fn().mockResolvedValue({ success: true }),
  reportTarget: jest.fn().mockResolvedValue({ success: true }),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { CommentSheet, EmojiReactionBar } = require('@/components/circle');

describe('CommentSheet — render smoke', () => {
  it('lista de comentarios poblada renderiza sin throw', async () => {
    render(
      <CommentSheet postId="p1" userId="me" visible onClose={() => {}} />,
    );
    await waitFor(() => expect(screen.getByText('Gran reflexión.')).toBeTruthy());
    expect(screen.getByText('De acuerdo, hermano.')).toBeTruthy();
    expect(screen.getByText('COMENTARIOS (2)')).toBeTruthy();
  });
});

describe('EmojiReactionBar — render smoke', () => {
  it('grupos con conteos y mi reacción marcada renderiza sin throw', () => {
    render(
      <EmojiReactionBar
        groups={[
          { type: 'like', count: 3, mine: false },
          { type: '🔥', count: 2, mine: true },
        ]}
        onSelect={() => {}}
      />,
    );
    expect(screen.getByText('3')).toBeTruthy();
    expect(screen.getByText('🔥')).toBeTruthy();
    expect(screen.getByLabelText('🔥: 2, tu reacción')).toBeTruthy();
  });
});
