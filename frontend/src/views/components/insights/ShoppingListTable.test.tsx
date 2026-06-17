import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { WardrobeCategoryHealth } from '../../../models/WardrobeInsightResult';
import ShoppingListTable from './ShoppingListTable';

const makeCategory = (
  overrides: Partial<WardrobeCategoryHealth> & Pick<WardrobeCategoryHealth, 'id'>
): WardrobeCategoryHealth => ({
  category: overrides.id,
  status: 'Good',
  summary: '',
  details: '',
  ownedColors: [],
  ownedStyles: [],
  missingColors: [],
  missingStyles: [],
  recommendedStep: '',
  ...overrides,
});

describe('ShoppingListTable', () => {
  const categories: WardrobeCategoryHealth[] = [
    makeCategory({
      id: 'shirt',
      missingStyles: ['oxford'],
      missingColors: ['navy'],
    }),
    makeCategory({
      id: 'trouser',
      missingStyles: ['chino'],
      missingColors: ['charcoal'],
    }),
    makeCategory({ id: 'belt', status: 'Good' }),
  ];

  it('renders intro, table headers, and rows', () => {
    render(<ShoppingListTable categories={categories} />);

    expect(screen.getByTestId('shopping-list-table')).toBeInTheDocument();
    expect(
      screen.getByText(/After analyzing your wardrobe, below is the list of items you need to buy/i)
    ).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Category' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Style' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Color' })).toBeInTheDocument();
    expect(screen.getByTestId('shopping-list-row-shirt-Oxford-Navy-0')).toHaveTextContent('Shirt');
    expect(screen.getByTestId('shopping-list-row-shirt-Oxford-Navy-0')).toHaveTextContent('Oxford');
    expect(screen.getByTestId('shopping-list-row-shirt-Oxford-Navy-0')).toHaveTextContent('Navy');
    expect(screen.getByTestId('shopping-list-row-trouser-Chino-Charcoal-0')).toHaveTextContent('Pant');
    expect(screen.queryByTestId('shopping-list-row-belt')).not.toBeInTheDocument();
  });

  it('shows empty state when no rows qualify', () => {
    render(<ShoppingListTable categories={[makeCategory({ id: 'belt', status: 'Good' })]} />);

    expect(
      screen.getByText(/Your wardrobe looks complete for this analysis — nothing urgent to buy/i)
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Export CSV/i })).not.toBeInTheDocument();
  });

  it('downloads CSV when Export CSV is clicked', () => {
    const clickSpy = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    const createObjectURLSpy = jest.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock');
    const revokeObjectURLSpy = jest.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);

    render(<ShoppingListTable categories={categories} />);
    fireEvent.click(screen.getByTestId('shopping-list-export-csv'));

    expect(createObjectURLSpy).toHaveBeenCalled();
    expect(clickSpy).toHaveBeenCalled();

    clickSpy.mockRestore();
    createObjectURLSpy.mockRestore();
    revokeObjectURLSpy.mockRestore();
  });

  it('opens WhatsApp with encoded bullet list', () => {
    const openSpy = jest.spyOn(window, 'open').mockImplementation(() => null);

    render(<ShoppingListTable categories={categories} />);
    fireEvent.click(screen.getByTestId('shopping-list-send-whatsapp'));

    expect(openSpy).toHaveBeenCalled();
    const url = String(openSpy.mock.calls[0][0]);
    expect(url).toContain('https://wa.me/?text=');
    const decoded = decodeURIComponent(url.replace('https://wa.me/?text=', ''));
    expect(decoded).toContain('Shopping list (wardrobe analysis)');
    expect(decoded).toContain('• Shirt — Oxford, Navy');
    expect(decoded).toContain('• Pant — Chino, Charcoal');

    openSpy.mockRestore();
  });
});
