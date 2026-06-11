import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { LoginScreen } from '../LoginScreen';

jest.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({
    signIn: jest.fn(),
    googleSignIn: jest.fn(),
  }),
}));

jest.mock('expo-auth-session', () => ({
  makeRedirectUri: jest.fn(),
  useAuthRequest: () => [
    {}, // request
    null, // response
    jest.fn(), // promptAsync
  ],
  ResponseType: {
    IdToken: 'id_token',
  },
}));

jest.mock('expo-web-browser', () => ({
  maybeCompleteAuthSession: jest.fn(),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

describe('LoginScreen', () => {
  it('should render login form', () => {
    const { getByPlaceholderText, getAllByText } = render(<LoginScreen />);
    
    expect(getByPlaceholderText('name@example.com')).toBeTruthy();
    expect(getByPlaceholderText('••••••••')).toBeTruthy();
    expect(getAllByText('SIGN IN').length).toBeGreaterThan(0);
  });

  it('should validate empty fields', async () => {
    const { getAllByText, getByText } = render(<LoginScreen />);
    
    fireEvent.press(getAllByText('SIGN IN')[0]);
    
    await waitFor(() => {
      expect(getByText(/Please enter email and password/i)).toBeTruthy();
    });
  });
});