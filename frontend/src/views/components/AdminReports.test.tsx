import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import AdminReports from './AdminReports';
import type { User } from '../../models/AuthModels';

const mockGetAccessLogStats = jest.fn();
const mockGetAccessLogUsage = jest.fn();
const mockGetAccessLogs = jest.fn();

jest.mock('../../services/ApiService', () => ({
  __esModule: true,
  default: {
    getAccessLogStats: (...args: unknown[]) => mockGetAccessLogStats(...args),
    getAccessLogUsage: (...args: unknown[]) => mockGetAccessLogUsage(...args),
    getAccessLogs: (...args: unknown[]) => mockGetAccessLogs(...args),
  },
}));

const adminUser: User = {
  id: 1,
  email: 'admin@example.com',
  full_name: 'Admin User',
  is_active: true,
  is_admin: true,
  email_verified: true,
  created_at: '2024-01-01T00:00:00Z',
};

const nonAdminUser: User = {
  ...adminUser,
  is_admin: false,
};

describe('AdminReports', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetAccessLogStats.mockResolvedValue({ total_requests: 10, unique_ip_addresses: 5, average_response_time_ms: 100 });
    mockGetAccessLogUsage.mockResolvedValue({
      ai_calls: { total: 2, outfit_suggestions: 1, wardrobe_analysis: 1 },
      wardrobe_operations: { total: 5, add: 2, view: 3 },
      outfit_history: { views: 3, unique_users: 2 },
    });
    mockGetAccessLogs.mockResolvedValue({
      total: 2,
      logs: [
        { id: 1, user_email: 'user1@test.com', operation_type: 'wardrobe_view', method: 'GET', endpoint: '/api/wardrobe', status_code: 200 },
        { id: 2, user_email: 'user2@test.com', operation_type: 'auth_login', method: 'POST', endpoint: '/api/auth/login', status_code: 200 },
      ],
    });
  });

  it('shows admin-required message for non-admin user', () => {
    render(<AdminReports user={nonAdminUser} />);
    expect(screen.getByText(/Admin privileges are required/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Reports/i })).toBeInTheDocument();
    expect(mockGetAccessLogStats).not.toHaveBeenCalled();
  });

  it('renders Admin Reports header and filters for admin user', () => {
    render(<AdminReports user={adminUser} />);
    expect(screen.getByRole('heading', { name: /Admin Reports/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/User name\/email contains/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Country')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Search/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Clear' })).toBeInTheDocument();
    expect(screen.getByText(/Ready when you are/i)).toBeInTheDocument();
  });

  it('Search button triggers API calls with current filters', async () => {
    render(<AdminReports user={adminUser} />);
    fireEvent.click(screen.getByRole('button', { name: /Search/i }));

    await screen.findByText(/Recent access logs/i);

    expect(mockGetAccessLogStats).toHaveBeenCalled();
    expect(mockGetAccessLogUsage).toHaveBeenCalled();
    expect(mockGetAccessLogs).toHaveBeenCalled();
  });

  it('Clear button resets filters and data', async () => {
    render(<AdminReports user={adminUser} />);
    fireEvent.click(screen.getByRole('button', { name: /Search/i }));
    await screen.findByText(/Recent access logs/i);

    expect(screen.getByText(/user1@test\.com/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /^Clear$/ }));
    expect(screen.getByText(/Ready when you are/i)).toBeInTheDocument();
  });

  it('table filter narrows displayed logs', async () => {
    render(<AdminReports user={adminUser} />);
    fireEvent.click(screen.getByRole('button', { name: /Search/i }));
    await screen.findByText(/Recent access logs/i);

    const tableFilterInput = screen.getByPlaceholderText(/Filter table rows/i);
    fireEvent.change(tableFilterInput, { target: { value: 'wardrobe' } });

    expect(screen.getByText(/user1@test\.com/i)).toBeInTheDocument();
    expect(screen.queryByText(/user2@test\.com/i)).not.toBeInTheDocument();
  });

  it('Clear table filter button resets table filter', async () => {
    render(<AdminReports user={adminUser} />);
    fireEvent.click(screen.getByRole('button', { name: /Search/i }));
    await screen.findByText(/Recent access logs/i);

    const tableFilterInput = screen.getByPlaceholderText(/Filter table rows/i);
    fireEvent.change(tableFilterInput, { target: { value: 'wardrobe' } });

    fireEvent.click(screen.getByRole('button', { name: /Clear table filter/i }));
    expect(tableFilterInput).toHaveValue('');
  });
});
