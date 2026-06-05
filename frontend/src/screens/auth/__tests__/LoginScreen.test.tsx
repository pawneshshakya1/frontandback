import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import LoginScreen from '../LoginScreen'; // Adjust path as needed

jest.mock('../../../store/useAuthStore', () => ({
  useAuthStore: () => ({
    login: jest.fn(),
    isLoading: false,
    error: null,
  }),
}));

describe('LoginScreen', () => {
  it('should render login form', () => {
    const { getByPlaceholderText, getByText } = render(<LoginScreen />);
    
    expect(getByPlaceholderText(/email/i)).toBeTruthy();
    expect(getByPlaceholderText(/password/i)).toBeTruthy();
    expect(getByText(/login/i)).toBeTruthy();
  });

  it('should validate empty fields', async () => {
    const { getByText } = render(<LoginScreen />);
    
    fireEvent.press(getByText(/login/i));
    
    await waitFor(() => {
      // Adjust based on your validation messages
      expect(getByText(/email is required/i)).toBeTruthy();
    });
  });
});