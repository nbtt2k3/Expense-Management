import api, { expenseApi, logout } from './api';
import axios from 'axios';

// Mock axios BEFORE import
jest.mock('axios', () => {
    const mockApi = {
        get: jest.fn(),
        post: jest.fn(),
        put: jest.fn(),
        delete: jest.fn(),
        interceptors: {
            request: { use: jest.fn(), eject: jest.fn() },
            response: { use: jest.fn(), eject: jest.fn() },
        },
    };
    return {
        create: jest.fn(() => mockApi),
        ...mockApi
    };
});

describe('api', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('expenseApi', () => {
        it('getExpenses should call api.get with correct url', async () => {
            // Mock api.get implementation
            (api.get as jest.Mock).mockResolvedValue({ data: [] });

            await expenseApi.getExpenses({ page: 1 });

            expect(api.get).toHaveBeenCalledWith('/expenses/', { params: { page: 1 } });
        });

        it('createExpense should call api.post with correct data', async () => {
            (api.post as jest.Mock).mockResolvedValue({ data: { id: 1 } });
            const expenseData = { amount: 100, description: 'Test' };

            await expenseApi.createExpense(expenseData);

            expect(api.post).toHaveBeenCalledWith('/expenses/', expenseData);
        });
    });

    describe('logout', () => {
        it('should call logout endpoint and clear local storage', async () => {
            (api.post as jest.Mock).mockResolvedValue({});
            const setItemSpy = jest.spyOn(Storage.prototype, 'removeItem');

            await logout();

            expect(api.post).toHaveBeenCalledWith('/auth/logout');
            expect(setItemSpy).toHaveBeenCalledWith('access_token');
            expect(setItemSpy).toHaveBeenCalledWith('refresh_token');
        });
    });
});
