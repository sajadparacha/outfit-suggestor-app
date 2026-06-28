import React from 'react';
import { render, screen } from '@testing-library/react';
import MainWardrobeBar from './MainWardrobeBar';

describe('MainWardrobeBar', () => {
  it('renders wardrobe thumbnails with data URL src', () => {
    render(
      <MainWardrobeBar
        isAuthenticated
        totalCount={5}
        items={[
          {
            id: 1,
            category: 'shirt',
            name: null,
            description: 'Blue shirt',
            color: 'blue',
            brand: null,
            size: null,
            image_data: 'thumbBase64',
            tags: null,
            condition: null,
            wear_count: 0,
            created_at: '2024-01-01',
            updated_at: '2024-01-01',
          },
        ]}
        onViewWardrobe={jest.fn()}
      />
    );

    const img = screen.getByRole('img', { name: 'shirt' });
    expect(img).toHaveAttribute('src', 'data:image/jpeg;base64,thumbBase64');
  });
});
