'use client';

import { useState, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Store, Lock, Save, Sun, Moon, Tags, X } from 'lucide-react';
import {
  getStoreSettingsUseCase,
  updateStoreSettingsUseCase,
  getFirebaseAuth,
  categoryRepository,
} from '@car-spa/infrastructure';
import { storeSettingsSchema, changePasswordSchema } from '@car-spa/domain';
import type { StoreSettingsInput, ChangePasswordInput, Category } from '@car-spa/domain';
import { hasPermission } from '@car-spa/shared';
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuthStore } from '@/features/authentication/stores/auth-store';
import { useCategories } from '@/features/inventory/api/use-inventory';
import { useTheme } from 'next-themes';

export function SettingsPage() {
  const session = useAuthStore((s) => s.session);
  const orgId = session?.orgId;
  const actorId = session?.userId;
  const role = session?.role ?? 'employee';
  const canManageSettings = hasPermission(role, 'settings:update');

  const [settingsSuccess, setSettingsSuccess] = useState<string | null>(null);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const { theme, setTheme } = useTheme();

  const { data: existingSettings, isLoading: settingsLoading } = useQuery({
    queryKey: ['storeSettings', orgId],
    queryFn: () => (orgId ? getStoreSettingsUseCase.execute(orgId) : null),
    enabled: !!orgId,
  });

  const categoriesQ = useCategories(orgId ?? '');
  const categories = categoriesQ.data ?? [];

  const settingsForm = useForm({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(storeSettingsSchema) as any,
    defaultValues: {
      storeName: '',
      address: '',
      phone: '',
      email: '',
      gstin: '',
      taxRate: 0,
      logoUrl: '',
      whatsappProvider: 'NONE',
      whatsappApiKey: '',
      whatsappPhoneNumberId: '',
      whatsappTemplateId: '',
      workingDaysPerMonth: 26,
      defaultLeaveType: 'UNPAID',
    },
  });

  useEffect(() => {
    if (existingSettings) {
      settingsForm.reset({
        storeName: existingSettings.storeName,
        address: existingSettings.address ?? '',
        phone: existingSettings.phone ?? '',
        email: existingSettings.email ?? '',
        gstin: existingSettings.gstin ?? '',
        taxRate: existingSettings.taxRate,
        logoUrl: existingSettings.logoUrl ?? '',
        whatsappProvider: existingSettings.whatsappProvider,
        whatsappApiKey: existingSettings.whatsappApiKey ?? '',
        whatsappPhoneNumberId: existingSettings.whatsappPhoneNumberId ?? '',
        whatsappTemplateId: existingSettings.whatsappTemplateId ?? '',
        workingDaysPerMonth: existingSettings.workingDaysPerMonth,
        defaultLeaveType: existingSettings.defaultLeaveType,
      });
    }
  }, [existingSettings, settingsForm]);

  const updateSettingsMutation = useMutation({
    mutationFn: (input: StoreSettingsInput) =>
      updateStoreSettingsUseCase.execute(input, orgId!, actorId!),
    onSuccess: (result) => {
      if (result.success) {
        setSettingsSuccess('Store settings saved successfully.');
        setSettingsError(null);
      } else {
        setSettingsError(result.error.message);
        setSettingsSuccess(null);
      }
    },
    onError: (err: Error) => {
      setSettingsError(err.message);
      setSettingsSuccess(null);
    },
  });

  const onSettingsSubmit = settingsForm.handleSubmit(async (data) => {
    setSettingsSuccess(null);
    setSettingsError(null);
    await updateSettingsMutation.mutateAsync(data as StoreSettingsInput);
  });

  const passwordForm = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });

  const changePasswordMutation = useMutation({
    mutationFn: async ({ currentPassword, newPassword }: { currentPassword: string; newPassword: string }) => {
      const auth = getFirebaseAuth();
      const user = auth.currentUser;
      if (!user || !user.email) throw new Error('No authenticated user found');
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);
    },
    onSuccess: () => {
      setPasswordSuccess('Password changed successfully.');
      setPasswordError(null);
      passwordForm.reset();
    },
    onError: (err: Error) => {
      setPasswordError(err.message);
      setPasswordSuccess(null);
    },
  });

  const onPasswordSubmit = passwordForm.handleSubmit(async (data) => {
    setPasswordSuccess(null);
    setPasswordError(null);
    await changePasswordMutation.mutateAsync({
      currentPassword: data.currentPassword,
      newPassword: data.newPassword,
    });
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      <div>
        <h1 className="font-display text-3xl tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Workshop preferences and account settings.</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Store className="text-muted-foreground h-5 w-5" />
            <CardTitle>Store Settings</CardTitle>
          </div>
          <CardDescription>
            Configure your workshop details, tax rate, and default leave preferences.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {settingsLoading ? (
            <p className="text-muted-foreground text-sm">Loading settings…</p>
          ) : (
            <form onSubmit={onSettingsSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="storeName">Store name</Label>
                <Input id="storeName" {...settingsForm.register('storeName')} />
                {settingsForm.formState.errors.storeName && (
                  <p className="text-destructive text-sm">{settingsForm.formState.errors.storeName.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input id="address" {...settingsForm.register('address')} />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" {...settingsForm.register('phone')} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" {...settingsForm.register('email')} />
                  {settingsForm.formState.errors.email && (
                    <p className="text-destructive text-sm">{settingsForm.formState.errors.email.message}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="gstin">GSTIN</Label>
                  <Input id="gstin" {...settingsForm.register('gstin')} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="taxRate">Tax rate (%)</Label>
                  <Input
                    id="taxRate"
                    type="number"
                    step="0.01"
                    {...settingsForm.register('taxRate', { valueAsNumber: true })}
                  />
                  {settingsForm.formState.errors.taxRate && (
                    <p className="text-destructive text-sm">{settingsForm.formState.errors.taxRate.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="logoUrl">Logo URL</Label>
                <Input id="logoUrl" {...settingsForm.register('logoUrl')} />
              </div>

              <div className="space-y-3 rounded-md border p-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">WhatsApp Notifications</span>
                </div>
                <p className="text-muted-foreground text-xs">
                  A WhatsApp message is sent to the customer and the owner on every vehicle task
                  status change. Enter the WhatsApp Business API credentials to enable it.
                </p>
                <div className="space-y-2">
                  <Label htmlFor="whatsappProvider">Provider</Label>
                  <select
                    id="whatsappProvider"
                    className="border-input bg-input ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                    {...settingsForm.register('whatsappProvider')}
                  >
                    <option value="NONE">Disabled</option>
                    <option value="META">Meta (WhatsApp Business Cloud API)</option>
                    <option value="TWILIO">Twilio (not yet supported by the sender)</option>
                  </select>
                </div>
                {settingsForm.watch('whatsappProvider') === 'META' && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="whatsappApiKey">API token (access token)</Label>
                      <Input
                        id="whatsappApiKey"
                        type="password"
                        placeholder="Paste your permanent access token"
                        {...settingsForm.register('whatsappApiKey')}
                      />
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="whatsappPhoneNumberId">Phone number ID</Label>
                        <Input id="whatsappPhoneNumberId" {...settingsForm.register('whatsappPhoneNumberId')} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="whatsappTemplateId">Template name</Label>
                        <Input
                          id="whatsappTemplateId"
                          placeholder="vehicle_task_update"
                          {...settingsForm.register('whatsappTemplateId')}
                        />
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="workingDaysPerMonth">Working days / month</Label>
                  <Input
                    id="workingDaysPerMonth"
                    type="number"
                    {...settingsForm.register('workingDaysPerMonth', { valueAsNumber: true })}
                  />
                  {settingsForm.formState.errors.workingDaysPerMonth && (
                    <p className="text-destructive text-sm">
                      {settingsForm.formState.errors.workingDaysPerMonth.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="defaultLeaveType">Default leave type</Label>
                  <select
                    id="defaultLeaveType"
                    className="border-input bg-input ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                    {...settingsForm.register('defaultLeaveType')}
                  >
                    <option value="UNPAID">Unpaid</option>
                    <option value="PAID">Paid</option>
                  </select>
                </div>
              </div>

              {settingsSuccess && (
                <p className="text-emerald-600 text-sm">{settingsSuccess}</p>
              )}
              {settingsError && (
                <p className="text-destructive text-sm">{settingsError}</p>
              )}

              <Button type="submit" disabled={updateSettingsMutation.isPending}>
                <Save className="h-4 w-4" />
                {updateSettingsMutation.isPending ? 'Saving…' : 'Save settings'}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>

      {canManageSettings && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Tags className="text-muted-foreground h-5 w-5" />
              <CardTitle>Product Names</CardTitle>
            </div>
            <CardDescription>
              Predefined product names per category. Shown as a dropdown when adding products, with a
              &quot;New&quot; option to add more.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {categoriesQ.isLoading ? (
              <p className="text-muted-foreground text-sm">Loading categories…</p>
            ) : categories.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                No categories yet. Create categories in Inventory first.
              </p>
            ) : (
              <div className="space-y-3">
                {categories.map((cat) => (
                  <CategoryProductNamesEditor key={cat.id} category={cat} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            {theme === 'dark' ? <Moon className="text-muted-foreground h-5 w-5" /> : <Sun className="text-muted-foreground h-5 w-5" />}
            <CardTitle>Theme</CardTitle>
          </div>
          <CardDescription>Switch between light and dark mode.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <Button
              variant={theme === 'light' ? 'default' : 'outline'}
              onClick={() => setTheme('light')}
              className="flex-1"
            >
              <Sun className="h-4 w-4 mr-2" />
              Light
            </Button>
            <Button
              variant={theme === 'dark' ? 'default' : 'outline'}
              onClick={() => setTheme('dark')}
              className="flex-1"
            >
              <Moon className="h-4 w-4 mr-2" />
              Dark
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Lock className="text-muted-foreground h-5 w-5" />
            <CardTitle>Change Password</CardTitle>
          </div>
          <CardDescription>Update your account password.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onPasswordSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Current password</Label>
              <Input
                id="currentPassword"
                type="password"
                {...passwordForm.register('currentPassword')}
              />
              {passwordForm.formState.errors.currentPassword && (
                <p className="text-destructive text-sm">
                  {passwordForm.formState.errors.currentPassword.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="newPassword">New password</Label>
              <Input
                id="newPassword"
                type="password"
                {...passwordForm.register('newPassword')}
              />
              {passwordForm.formState.errors.newPassword && (
                <p className="text-destructive text-sm">
                  {passwordForm.formState.errors.newPassword.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm new password</Label>
              <Input
                id="confirmPassword"
                type="password"
                {...passwordForm.register('confirmPassword')}
              />
              {passwordForm.formState.errors.confirmPassword && (
                <p className="text-destructive text-sm">
                  {passwordForm.formState.errors.confirmPassword.message}
                </p>
              )}
            </div>

            {passwordSuccess && (
              <p className="text-emerald-600 text-sm">{passwordSuccess}</p>
            )}
            {passwordError && (
              <p className="text-destructive text-sm">{passwordError}</p>
            )}

            <Button type="submit" disabled={changePasswordMutation.isPending}>
              <Lock className="h-4 w-4" />
              {changePasswordMutation.isPending ? 'Changing…' : 'Change password'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function CategoryProductNamesEditor({ category }: { category: Category }) {
  const queryClient = useQueryClient();
  const [names, setNames] = useState<string[]>(category.productNames ?? []);
  const [newName, setNewName] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setNames(category.productNames ?? []);
  }, [category.productNames]);

  const addName = () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    if (!names.includes(trimmed)) setNames([...names, trimmed]);
    setNewName('');
    setSaved(false);
  };

  const removeName = (n: string) => {
    setNames(names.filter((x) => x !== n));
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await categoryRepository.update(category.id, { productNames: names });
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const dirty = JSON.stringify(names) !== JSON.stringify(category.productNames ?? []);

  return (
    <div className="space-y-3 rounded-md border p-3">
      <p className="text-sm font-medium">
        {category.name}{' '}
        <span className="text-muted-foreground text-xs font-normal">
          ({category.codePrefix})
        </span>
      </p>
      <div className="flex gap-2">
        <Input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addName();
            }
          }}
          placeholder="Add a name (e.g. MRF)"
          className="text-sm"
        />
        <Button type="button" variant="outline" size="sm" onClick={addName} disabled={!newName.trim()}>
          Add
        </Button>
      </div>
      {names.length === 0 ? (
        <p className="text-muted-foreground text-xs">No predefined names yet.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {names.map((n) => (
            <span key={n} className="bg-muted flex items-center gap-1 rounded px-2 py-1 text-sm">
              {n}
              <button
                onClick={() => removeName(n)}
                className="text-muted-foreground hover:text-destructive"
                aria-label={`Remove ${n}`}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="flex items-center gap-2">
        <Button type="button" size="sm" onClick={handleSave} disabled={saving || !dirty}>
          {saving ? 'Saving...' : 'Save'}
        </Button>
        {saved && <span className="text-emerald-600 text-sm">Saved</span>}
        {error && <span className="text-destructive text-sm">{error}</span>}
      </div>
    </div>
  );
}
