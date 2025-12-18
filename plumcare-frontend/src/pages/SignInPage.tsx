import {
  Anchor,
  Box,
  Button,
  Divider,
  PasswordInput,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { useMedplum } from '@medplum/react';
import type { JSX } from 'react';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { PlumCareLogo } from '../components/PlumCareLogo';

export function SignInPage(): JSX.Element {
  const navigate = useNavigate();
  const medplum = useMedplum();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Start login and get the response
      const loginResponse = await medplum.startLogin({ email, password });

      // Process the authorization code to complete authentication
      if (loginResponse.code) {
        await medplum.processCode(loginResponse.code);
      }

      navigate('/loading');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      style={{
        display: 'flex',
        minHeight: '100vh',
        width: '100%',
      }}
    >
      {/* Left Side - Login Form */}
      <Box
        style={{
          flex: '0 0 45%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '2rem',
          backgroundColor: '#fff',
        }}
      >
        <Box style={{ width: '100%', maxWidth: 400 }}>
          {/* Logo */}
          <Box mb={40}>
            <PlumCareLogo size={32} />
          </Box>

          {/* Title */}
          <Title order={2} mb="xl" style={{ color: '#2d3748' }}>
            Sign In
          </Title>

          {/* Form */}
          <form onSubmit={handleSubmit}>
            <Stack gap="md">
              <TextInput
                label="Email Address"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                size="md"
                styles={{
                  label: { color: '#4a5568', marginBottom: 8 },
                  input: { borderColor: '#e2e8f0' },
                }}
              />

              <PasswordInput
                label="Password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                size="md"
                styles={{
                  label: { color: '#4a5568', marginBottom: 8 },
                  input: { borderColor: '#e2e8f0' },
                }}
              />

              {error && (
                <Text size="sm" c="red">
                  {error}
                </Text>
              )}

              <Button
                type="submit"
                fullWidth
                size="md"
                loading={loading}
                style={{
                  backgroundColor: '#ff5500',
                  marginTop: 8,
                }}
              >
                Sign In
              </Button>

              <Anchor
                component="button"
                type="button"
                size="sm"
                style={{ color: '#ff5500' }}
              >
                Forgot Password?
              </Anchor>

              <Divider
                label="or"
                labelPosition="center"
                my="md"
                styles={{ label: { color: '#a0aec0' } }}
              />

              <Text size="sm" c="dimmed" ta="center">
                Please click here to sign up
              </Text>

              <Button
                variant="filled"
                fullWidth
                size="md"
                style={{ backgroundColor: '#ff5500' }}
                onClick={() => navigate('/register')}
              >
                Sign Up
              </Button>
            </Stack>
          </form>

          {/* Copyright */}
          <Text size="xs" c="dimmed" ta="center" mt={60}>
            Copyright © {new Date().getFullYear()} PlumCare - All Rights Reserved.
          </Text>
        </Box>
      </Box>

      {/* Right Side - Background Image */}
      <Box
        style={{
          flex: '0 0 55%',
          backgroundImage: 'url(/img/integrations/login-bg.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center 20%',
          backgroundRepeat: 'no-repeat',
        }}
      />
    </Box>
  );
}
