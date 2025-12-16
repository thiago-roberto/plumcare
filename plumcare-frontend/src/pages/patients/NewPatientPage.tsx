import {
  Box,
  Button,
  Card,
  Divider,
  Grid,
  Group,
  Paper,
  Select,
  Stack,
  Stepper,
  Text,
  TextInput,
  ThemeIcon,
  Title,
} from '@mantine/core';
import {
  IconArrowLeft,
  IconArrowRight,
  IconCheck,
  IconHome,
  IconPhone,
  IconUser,
} from '@tabler/icons-react';
import type { JSX } from 'react';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import classes from './NewPatientPage.module.css';

interface PatientFormData {
  firstName: string;
  middleName: string;
  lastName: string;
  birthDate: string;
  gender: string | null;
  email: string;
  phone: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;
  targetEhr: string | null;
}

export function NewPatientPage(): JSX.Element {
  const navigate = useNavigate();
  const [active, setActive] = useState(0);
  const [formData, setFormData] = useState<PatientFormData>({
    firstName: '',
    middleName: '',
    lastName: '',
    birthDate: '',
    gender: null,
    email: '',
    phone: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    postalCode: '',
    targetEhr: null,
  });

  const updateField = <K extends keyof PatientFormData>(field: K, value: PatientFormData[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const nextStep = () => setActive((current) => (current < 3 ? current + 1 : current));
  const prevStep = () => setActive((current) => (current > 0 ? current - 1 : current));

  const handleSubmit = () => {
    // In a real app, this would create the patient via Medplum
    console.log('Creating patient:', formData);
    navigate('/patients');
  };

  const isStep1Valid = formData.firstName && formData.lastName && formData.birthDate && formData.gender;
  const isStep2Valid = formData.phone || formData.email;
  const isStep3Valid = formData.city && formData.state;

  return (
    <Box>
      <Stack gap="lg">
        {/* Header */}
        <Group justify="space-between">
          <div>
            <Title order={1} className={classes.pageTitle}>
              New Patient
            </Title>
            <Text c="dimmed" size="sm">
              Register a new patient to sync with your EHR systems
            </Text>
          </div>
          <Button
            variant="subtle"
            color="gray"
            leftSection={<IconArrowLeft size={16} />}
            onClick={() => navigate('/patients')}
          >
            Back to Patients
          </Button>
        </Group>

        {/* Form */}
        <Paper p="xl" radius="md" withBorder className={classes.formCard}>
          <Stepper
            active={active}
            onStepClick={setActive}
            allowNextStepsSelect={false}
            className={classes.stepper}
          >
            <Stepper.Step
              label="Basic Info"
              description="Patient demographics"
              icon={<IconUser size={18} />}
            >
              <Card withBorder p="lg" mt="lg" radius="md">
                <Stack gap="md">
                  <Text fw={600} size="lg">Patient Information</Text>
                  <Divider />
                  <Grid>
                    <Grid.Col span={{ base: 12, sm: 4 }}>
                      <TextInput
                        label="First Name"
                        placeholder="Enter first name"
                        required
                        value={formData.firstName}
                        onChange={(e) => updateField('firstName', e.target.value)}
                      />
                    </Grid.Col>
                    <Grid.Col span={{ base: 12, sm: 4 }}>
                      <TextInput
                        label="Middle Name"
                        placeholder="Enter middle name"
                        value={formData.middleName}
                        onChange={(e) => updateField('middleName', e.target.value)}
                      />
                    </Grid.Col>
                    <Grid.Col span={{ base: 12, sm: 4 }}>
                      <TextInput
                        label="Last Name"
                        placeholder="Enter last name"
                        required
                        value={formData.lastName}
                        onChange={(e) => updateField('lastName', e.target.value)}
                      />
                    </Grid.Col>
                    <Grid.Col span={{ base: 12, sm: 6 }}>
                      <TextInput
                        label="Date of Birth"
                        placeholder="YYYY-MM-DD"
                        type="date"
                        required
                        value={formData.birthDate}
                        onChange={(e) => updateField('birthDate', e.target.value)}
                        max={new Date().toISOString().split('T')[0]}
                      />
                    </Grid.Col>
                    <Grid.Col span={{ base: 12, sm: 6 }}>
                      <Select
                        label="Gender"
                        placeholder="Select gender"
                        required
                        data={[
                          { value: 'male', label: 'Male' },
                          { value: 'female', label: 'Female' },
                          { value: 'other', label: 'Other' },
                          { value: 'unknown', label: 'Unknown' },
                        ]}
                        value={formData.gender}
                        onChange={(value) => updateField('gender', value)}
                      />
                    </Grid.Col>
                  </Grid>
                </Stack>
              </Card>
            </Stepper.Step>

            <Stepper.Step
              label="Contact"
              description="Phone and email"
              icon={<IconPhone size={18} />}
            >
              <Card withBorder p="lg" mt="lg" radius="md">
                <Stack gap="md">
                  <Text fw={600} size="lg">Contact Information</Text>
                  <Divider />
                  <Grid>
                    <Grid.Col span={{ base: 12, sm: 6 }}>
                      <TextInput
                        label="Phone Number"
                        placeholder="(555) 555-5555"
                        value={formData.phone}
                        onChange={(e) => updateField('phone', e.target.value)}
                      />
                    </Grid.Col>
                    <Grid.Col span={{ base: 12, sm: 6 }}>
                      <TextInput
                        label="Email Address"
                        placeholder="patient@example.com"
                        type="email"
                        value={formData.email}
                        onChange={(e) => updateField('email', e.target.value)}
                      />
                    </Grid.Col>
                  </Grid>
                </Stack>
              </Card>
            </Stepper.Step>

            <Stepper.Step
              label="Address"
              description="Location details"
              icon={<IconHome size={18} />}
            >
              <Card withBorder p="lg" mt="lg" radius="md">
                <Stack gap="md">
                  <Text fw={600} size="lg">Address Information</Text>
                  <Divider />
                  <Grid>
                    <Grid.Col span={12}>
                      <TextInput
                        label="Address Line 1"
                        placeholder="Street address"
                        value={formData.addressLine1}
                        onChange={(e) => updateField('addressLine1', e.target.value)}
                      />
                    </Grid.Col>
                    <Grid.Col span={12}>
                      <TextInput
                        label="Address Line 2"
                        placeholder="Apartment, suite, etc."
                        value={formData.addressLine2}
                        onChange={(e) => updateField('addressLine2', e.target.value)}
                      />
                    </Grid.Col>
                    <Grid.Col span={{ base: 12, sm: 4 }}>
                      <TextInput
                        label="City"
                        placeholder="City"
                        required
                        value={formData.city}
                        onChange={(e) => updateField('city', e.target.value)}
                      />
                    </Grid.Col>
                    <Grid.Col span={{ base: 12, sm: 4 }}>
                      <Select
                        label="State"
                        placeholder="Select state"
                        required
                        searchable
                        data={[
                          'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
                          'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
                          'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
                          'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
                          'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
                        ]}
                        value={formData.state}
                        onChange={(value) => updateField('state', value ?? '')}
                      />
                    </Grid.Col>
                    <Grid.Col span={{ base: 12, sm: 4 }}>
                      <TextInput
                        label="ZIP Code"
                        placeholder="12345"
                        value={formData.postalCode}
                        onChange={(e) => updateField('postalCode', e.target.value)}
                      />
                    </Grid.Col>
                  </Grid>
                </Stack>
              </Card>
            </Stepper.Step>

            <Stepper.Step
              label="Confirm"
              description="Review and sync"
              icon={<IconCheck size={18} />}
            >
              <Card withBorder p="lg" mt="lg" radius="md">
                <Stack gap="md">
                  <Text fw={600} size="lg">Review & Select EHR</Text>
                  <Divider />

                  <Grid>
                    <Grid.Col span={{ base: 12, md: 6 }}>
                      <Paper p="md" withBorder radius="md" bg="gray.0">
                        <Stack gap="xs">
                          <Text size="sm" fw={600} c="dimmed">Patient Details</Text>
                          <Text fw={500}>
                            {formData.firstName} {formData.middleName} {formData.lastName}
                          </Text>
                          <Text size="sm" c="dimmed">
                            DOB: {formData.birthDate || 'Not set'}
                          </Text>
                          <Text size="sm" c="dimmed">
                            Gender: {formData.gender ?? 'Not set'}
                          </Text>
                        </Stack>
                      </Paper>
                    </Grid.Col>

                    <Grid.Col span={{ base: 12, md: 6 }}>
                      <Paper p="md" withBorder radius="md" bg="gray.0">
                        <Stack gap="xs">
                          <Text size="sm" fw={600} c="dimmed">Contact & Address</Text>
                          <Text size="sm">{formData.phone || 'No phone'}</Text>
                          <Text size="sm">{formData.email || 'No email'}</Text>
                          <Text size="sm">
                            {formData.city && formData.state
                              ? `${formData.city}, ${formData.state} ${formData.postalCode}`
                              : 'No address'}
                          </Text>
                        </Stack>
                      </Paper>
                    </Grid.Col>
                  </Grid>

                  <Select
                    label="Target EHR System"
                    description="Select which EHR to sync this patient to"
                    placeholder="Select EHR system"
                    required
                    data={[
                      { value: 'athena', label: 'Athena Health' },
                      { value: 'elation', label: 'Elation Health' },
                      { value: 'nextgen', label: 'NextGen Healthcare' },
                    ]}
                    value={formData.targetEhr}
                    onChange={(value) => updateField('targetEhr', value)}
                  />
                </Stack>
              </Card>
            </Stepper.Step>

            <Stepper.Completed>
              <Card withBorder p="lg" mt="lg" radius="md" ta="center">
                <ThemeIcon size={60} radius="xl" className={classes.successIcon} mx="auto" mb="md">
                  <IconCheck size={30} />
                </ThemeIcon>
                <Title order={3} mb="xs">Patient Created Successfully!</Title>
                <Text c="dimmed" mb="lg">
                  The patient will be synced to your selected EHR system.
                </Text>
                <Button onClick={() => navigate('/patients')}>
                  View All Patients
                </Button>
              </Card>
            </Stepper.Completed>
          </Stepper>

          {active < 4 && (
            <Group justify="flex-end" mt="xl">
              {active > 0 && (
                <Button variant="default" onClick={prevStep}>
                  Back
                </Button>
              )}
              {active < 3 && (
                <Button
                  onClick={nextStep}
                  rightSection={<IconArrowRight size={16} />}
                  disabled={
                    (active === 0 && !isStep1Valid) ||
                    (active === 1 && !isStep2Valid) ||
                    (active === 2 && !isStep3Valid)
                  }
                  className={classes.nextButton}
                >
                  Next
                </Button>
              )}
              {active === 3 && (
                <Button
                  onClick={handleSubmit}
                  rightSection={<IconCheck size={16} />}
                  disabled={!formData.targetEhr}
                  className={classes.submitButton}
                >
                  Create Patient
                </Button>
              )}
            </Group>
          )}
        </Paper>
      </Stack>
    </Box>
  );
}
