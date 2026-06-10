import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AdminReports from './AdminReports';
import type { User } from '../../models/AuthModels';

const mockGetAccessLogStats = jest.fn();
const mockGetAccessLogUsage = jest.fn();
const mockGetAccessLogTimeline = jest.fn();
const mockGetSearchReports = jest.fn();

jest.mock('recharts', () => {
  const MockContainer = ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="recharts-responsive">{children}</div>
  );
  return {
    ResponsiveContainer: MockContainer,
    LineChart: ({ children }: { children?: React.ReactNode }) => (
      <div data-testid="line-chart">{children}</div>
    ),
    BarChart: ({ children }: { children?: React.ReactNode }) => (
      <div data-testid="bar-chart">{children}</div>
    ),
    Line: () => null,
    Bar: () => null,
    Cell: () => null,
    CartesianGrid: () => null,
    XAxis: () => null,
    YAxis: () => null,
    Tooltip: () => null,
  };
});

jest.mock('../../services/ApiService', () => ({
  __esModule: true,
  default: {
    getAccessLogStats: (...args: unknown[]) => mockGetAccessLogStats(...args),
    getAccessLogUsage: (...args: unknown[]) => mockGetAccessLogUsage(...args),
    getAccessLogTimeline: (...args: unknown[]) => mockGetAccessLogTimeline(...args),
    getSearchReports: (...args: unknown[]) => mockGetSearchReports(...args),
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

const mockReportData = {
  stats: {
    total_requests: 10,
    unique_ip_addresses: 5,
    average_response_time_ms: 100,
    by_country: [{ country: 'US', count: 8 }],
    by_city: [{ city: 'New York', country: 'US', count: 5 }],
  },
  usage: {
    ai_calls: { total: 2, outfit_suggestions: 1, wardrobe_analysis: 1, unique_users: 1 },
    wardrobe_operations: { total: 5, add: 2, view: 3, unique_users: 2 },
    outfit_history: { views: 3, unique_users: 2 },
    top_users: [
      {
        user_id: 2,
        user_email: 'user1@test.com',
        total_operations: 10,
        ai_outfit_suggestions: 3,
        ai_wardrobe_analysis: 1,
        outfit_history_views: 2,
      },
    ],
  },
  timeline: {
    group_by: 'day',
    timeline: [{ period: '2026-06-01T00:00:00', count: 4 }],
  },
  searchReports: {
    total_searches: 42,
    by_occasion: [{ occasion: 'business', count: 10 }],
    by_season: [{ season: 'summer', count: 8 }],
    by_style: [{ style: 'modern', count: 12 }],
    timeline: [{ period: '2026-06-01T00:00:00', count: 5 }],
    recent: [
      {
        id: 1,
        created_at: '2026-06-01T12:00:00Z',
        occasion: 'casual',
        season: 'all',
        style: 'modern',
        user_id: 2,
        user_email: 'user1@test.com',
      },
    ],
  },
};

describe('AdminReports', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetAccessLogStats.mockResolvedValue(mockReportData.stats);
    mockGetAccessLogUsage.mockResolvedValue(mockReportData.usage);
    mockGetAccessLogTimeline.mockResolvedValue(mockReportData.timeline);
    mockGetSearchReports.mockResolvedValue(mockReportData.searchReports);
  });

  it('shows admin-required message for non-admin user', () => {
    render(<AdminReports user={nonAdminUser} />);
    expect(screen.getByText(/Admin privileges are required/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Reports/i })).toBeInTheDocument();
    expect(mockGetAccessLogStats).not.toHaveBeenCalled();
    expect(mockGetAccessLogTimeline).not.toHaveBeenCalled();
    expect(mockGetSearchReports).not.toHaveBeenCalled();
  });

  it('renders Admin Reports header, filters, and four tabs for admin user', () => {
    render(<AdminReports user={adminUser} />);
    expect(screen.getByRole('heading', { name: /Admin Reports/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/User name\/email contains/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Country')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('City')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Search/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Clear' })).toBeInTheDocument();
    expect(screen.getByText(/Ready when you are/i)).toBeInTheDocument();

    expect(screen.getByRole('tab', { name: 'Overview' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Utilization' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Users' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Searches' })).toBeInTheDocument();
  });

  it('Search button triggers timeline and search report API calls', async () => {
    render(<AdminReports user={adminUser} />);
    fireEvent.click(screen.getByRole('button', { name: /Search/i }));

    await waitFor(() => {
      expect(mockGetAccessLogStats).toHaveBeenCalled();
      expect(mockGetAccessLogUsage).toHaveBeenCalled();
      expect(mockGetAccessLogTimeline).toHaveBeenCalledWith(
        expect.objectContaining({ group_by: 'day' })
      );
      expect(mockGetSearchReports).toHaveBeenCalled();
      expect(screen.getByRole('heading', { name: 'Overview' })).toBeInTheDocument();
    });

    expect(screen.getByTestId('overview-timeline-chart')).toBeInTheDocument();
  });

  it('passes city filter to timeline API', async () => {
    render(<AdminReports user={adminUser} />);
    fireEvent.change(screen.getByPlaceholderText('City'), { target: { value: 'London' } });
    fireEvent.click(screen.getByRole('button', { name: /Search/i }));

    await waitFor(() => {
      expect(mockGetAccessLogTimeline).toHaveBeenCalledWith(
        expect.objectContaining({ city: 'London', group_by: 'day' })
      );
    });
  });

  it('passes numeric user filter as user_id to all report APIs', async () => {
    render(<AdminReports user={adminUser} />);
    fireEvent.change(screen.getByPlaceholderText(/User name\/email contains/i), {
      target: { value: '42' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Search/i }));

    await waitFor(() => {
      expect(mockGetAccessLogStats).toHaveBeenCalledWith(expect.objectContaining({ user_id: 42 }));
      expect(mockGetAccessLogUsage).toHaveBeenCalledWith(expect.objectContaining({ user_id: 42 }));
      expect(mockGetAccessLogTimeline).toHaveBeenCalledWith(
        expect.objectContaining({ user_id: 42, group_by: 'day' })
      );
      expect(mockGetSearchReports).toHaveBeenCalledWith(expect.objectContaining({ user_id: 42 }));
    });
  });

  it('passes name/email user filter to all report APIs', async () => {
    render(<AdminReports user={adminUser} />);
    fireEvent.change(screen.getByPlaceholderText(/User name\/email contains/i), {
      target: { value: 'sajjad' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Search/i }));

    await waitFor(() => {
      expect(mockGetAccessLogStats).toHaveBeenCalledWith(expect.objectContaining({ user: 'sajjad' }));
      expect(mockGetAccessLogUsage).toHaveBeenCalledWith(expect.objectContaining({ user: 'sajjad' }));
      expect(mockGetAccessLogTimeline).toHaveBeenCalledWith(
        expect.objectContaining({ user: 'sajjad', group_by: 'day' })
      );
      expect(mockGetSearchReports).toHaveBeenCalledWith(expect.objectContaining({ user: 'sajjad' }));
    });
  });

  it('switching tabs shows correct section headings', async () => {
    render(<AdminReports user={adminUser} />);
    fireEvent.click(screen.getByRole('button', { name: /Search/i }));
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Overview' })).toBeInTheDocument());

    fireEvent.click(screen.getByRole('tab', { name: 'Utilization' }));
    expect(screen.getByRole('heading', { name: 'Utilization' })).toBeInTheDocument();
    expect(screen.getByTestId('utilization-bar-chart')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: 'Users' }));
    expect(screen.getByRole('heading', { name: 'Users' })).toBeInTheDocument();
    expect(screen.getByText(/Top users/i)).toBeInTheDocument();
    expect(screen.getByTestId('users-country-chart')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: 'Searches' }));
    expect(screen.getByRole('heading', { name: 'Searches' })).toBeInTheDocument();
    expect(screen.getByText(/Recent searches/i)).toBeInTheDocument();
    expect(screen.getByTestId('searches-occasion-chart')).toBeInTheDocument();
  });

  it('Clear button resets filters and data', async () => {
    render(<AdminReports user={adminUser} />);
    fireEvent.click(screen.getByRole('button', { name: /Search/i }));
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Overview' })).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /^Clear$/ }));
    expect(screen.getByText(/Ready when you are/i)).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Overview' })).not.toBeInTheDocument();
  });

  it('renders chart containers with data after search', async () => {
    render(<AdminReports user={adminUser} />);
    fireEvent.click(screen.getByRole('button', { name: /Search/i }));

    await waitFor(() => {
      expect(screen.getByTestId('overview-timeline-chart')).toBeInTheDocument();
      expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    });
  });
});
