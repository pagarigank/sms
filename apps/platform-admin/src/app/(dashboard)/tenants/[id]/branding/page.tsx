'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { useParams } from 'next/navigation';
import { useToast, useConfirm, Badge, statusToVariant, StatusDot } from '@sms/ui';
import { Image, Palette, Eye, Save, Undo2, Copy, Upload, Trash2, Sun, Moon, Building2, AlertTriangle, Settings, Wrench } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@sms/ui';
import { Button } from '@sms/ui';
import { Input } from '@sms/ui';
import { Label } from '@sms/ui';
import { Card, CardContent, CardHeader, CardTitle } from '@sms/ui';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@sms/ui';
import { cn } from '@sms/utils';

interface Tenant {
  id: string;
  name: string;
  slug: string;
  status: string;
  branding?: Record<string, unknown>;
  createdAt: string;
}

interface Branding {
  logo?: string;
  favicon?: string;
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  schoolName?: string;
  tagline?: string;
  footerText?: string;
  loginBackground?: string;
  customCss?: string;
  darkModePrimary?: string;
  darkModeSecondary?: string;
}

const DEFAULT_BRANDING: Branding = {
  primaryColor: '#1e3a5f',
  secondaryColor: '#3b82f6',
  accentColor: '#10b981',
  darkModePrimary: '#3b82f6',
  darkModeSecondary: '#60a5fa',
};

const tabs = [
  { value: 'general', label: 'General', icon: <Settings className="h-4 w-4" /> },
  { value: 'colors', label: 'Colors', icon: <Palette className="h-4 w-4" /> },
  { value: 'assets', label: 'Assets', icon: <Image className="h-4 w-4" /> },
  { value: 'advanced', label: 'Advanced', icon: <Wrench className="h-4 w-4" /> },
] as const;

export default function TenantBrandingPage() {
  const params = useParams();
  const tenantId = params.id as string;
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const confirm = useConfirm();
  const [activeTab, setActiveTab] = useState<string>('general');
  const [previewMode, setPreviewMode] = useState<'light' | 'dark'>('light');

  const { data: tenantRes } = useQuery({
    queryKey: ['tenant', tenantId],
    queryFn: () => apiClient.tenants.get(tenantId),
  });

  const tenant = tenantRes?.data;
  const existingBranding = (tenant?.branding as Record<string, unknown>) || {};

  const [form, setForm] = useState<Branding>({
    logo: (existingBranding.logo as string) || '',
    favicon: (existingBranding.favicon as string) || '',
    primaryColor: (existingBranding.primaryColor as string) || DEFAULT_BRANDING.primaryColor,
    secondaryColor: (existingBranding.secondaryColor as string) || DEFAULT_BRANDING.secondaryColor,
    accentColor: (existingBranding.accentColor as string) || DEFAULT_BRANDING.accentColor,
    schoolName: (existingBranding.schoolName as string) || '',
    tagline: (existingBranding.tagline as string) || '',
    footerText: (existingBranding.footerText as string) || '',
    loginBackground: (existingBranding.loginBackground as string) || '',
    customCss: (existingBranding.customCss as string) || '',
    darkModePrimary: (existingBranding.darkModePrimary as string) || DEFAULT_BRANDING.darkModePrimary,
    darkModeSecondary: (existingBranding.darkModeSecondary as string) || DEFAULT_BRANDING.darkModeSecondary,
  });

  const [originalForm, setOriginalForm] = useState<Branding>(form);
  const [hasChanges, setHasChanges] = useState(false);

  const updateMutation = useMutation({
    mutationFn: (data: Branding) => apiClient.tenants.update(tenantId, { branding: data as Record<string, unknown> }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant', tenantId] });
      setOriginalForm(form);
      setHasChanges(false);
      toast({ title: 'Branding saved', description: 'Branding has been updated successfully.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  // Renders the branded document header (as registrar-issued PDFs will carry)
  // from the *current draft* — so admins can check colors/logo/tagline before
  // saving, not after. Opens the returned PDF blob in a new tab.
  const previewMutation = useMutation({
    mutationFn: () => apiClient.documents.previewBranding({ branding: form as Record<string, unknown> }),
    onSuccess: ({ blob }) => {
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      // Give the new tab time to load before releasing the blob.
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    },
    onError: (error: Error) => {
      toast({ title: 'Preview failed', description: error.message, variant: 'destructive' });
    },
  });

  const resetMutation = useMutation({
    mutationFn: () => apiClient.tenants.update(tenantId, { branding: {} }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant', tenantId] });
      setForm(DEFAULT_BRANDING);
      setOriginalForm(DEFAULT_BRANDING);
      setHasChanges(false);
      toast({ title: 'Branding reset', description: 'Branding has been reset to defaults.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const handleChange = <K extends keyof Branding>(key: K, value: Branding[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleReset = async () => {
    const ok = await confirm({
      title: 'Reset all branding to defaults?',
      description: 'This cannot be undone.',
      confirmLabel: 'Reset',
      destructive: true,
    });
    if (ok) resetMutation.mutate();
  };

  const handleCopyColor = (color: string) => {
    navigator.clipboard.writeText(color);
    toast({ title: 'Copied', description: `${color} copied to clipboard` });
  };

  const getPreviewStyles = () => {
    const isDark = previewMode === 'dark';
    const primary = isDark ? form.darkModePrimary : form.primaryColor;
    const secondary = isDark ? form.darkModeSecondary : form.secondaryColor;
    const accent = form.accentColor;

    return {
      backgroundColor: isDark ? '#1e293b' : '#ffffff',
      color: isDark ? '#f1f5f9' : '#1e293b',
      primary,
      secondary,
      accent,
    };
  };

  const presetPalettes = [
    { name: 'Default', primary: '#1e3a5f', secondary: '#3b82f6', accent: '#10b981' },
    { name: 'Ocean', primary: '#0c4a6e', secondary: '#0284c7', accent: '#06b6d4' },
    { name: 'Forest', primary: '#14532d', secondary: '#16a34a', accent: '#84cc16' },
    { name: 'Sunset', primary: '#7c2d12', secondary: '#ea580c', accent: '#f97316' },
    { name: 'Royal', primary: '#362a5e', secondary: '#7c3aed', accent: '#d946ef' },
    { name: 'Medical', primary: '#0f766e', secondary: '#14b8a6', accent: '#5eead4' },
  ];

  const previewStyles = getPreviewStyles();
  const isDark = previewMode === 'dark';

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Tenant Branding</h1>
            <p className="text-muted-foreground">Configure logo, colors, and branding for {tenant?.name}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handleReset}
              disabled={!hasChanges || updateMutation.isPending}
            >
              <Undo2 className="h-4 w-4 mr-2" />
              Reset to Defaults
            </Button>
            <Button
              variant="outline"
              onClick={() => previewMutation.mutate()}
              disabled={previewMutation.isPending}
            >
              <Eye className="h-4 w-4 mr-2" />
              {previewMutation.isPending ? 'Rendering…' : 'Preview PDF'}
            </Button>
            <Button
              onClick={() => updateMutation.mutate(form)}
              disabled={!hasChanges || updateMutation.isPending}
            >
              <Save className="h-4 w-4 mr-2" />
              Save Branding
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            {tabs.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value}>
                {tab.icon}
                <span className="ml-2">{tab.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          {/* General Tab */}
          <TabsContent value="general" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>General Settings</CardTitle>
                <p className="text-sm text-muted-foreground">Basic branding information displayed across the platform</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="schoolName">School Name Override</Label>
                    <Input
                      id="schoolName"
                      value={form.schoolName}
                      onChange={(e) => handleChange('schoolName', e.target.value)}
                      placeholder="Leave blank to use tenant name"
                    />
                    <p className="text-xs text-muted-foreground mt-1">Used in headers, emails, and documents instead of tenant legal name</p>
                  </div>
                  <div>
                    <Label htmlFor="tagline">Tagline / Motto</Label>
                    <Input
                      id="tagline"
                      value={form.tagline}
                      onChange={(e) => handleChange('tagline', e.target.value)}
                      placeholder="Excellence in Education"
                    />
                    <p className="text-xs text-muted-foreground mt-1">Short tagline displayed alongside logo</p>
                  </div>
                </div>
                <div>
                  <Label htmlFor="footerText">Footer Text</Label>
                  <Input
                    id="footerText"
                    value={form.footerText}
                    onChange={(e) => handleChange('footerText', e.target.value)}
                    placeholder="© 2024 School Name. All rights reserved."
                  />
                  <p className="text-xs text-muted-foreground mt-1">Displayed at the bottom of all pages and emails</p>
                </div>
                <div>
                  <Label htmlFor="loginBackground">Login Page Background</Label>
                  <Input
                    id="loginBackground"
                    value={form.loginBackground}
                    onChange={(e) => handleChange('loginBackground', e.target.value)}
                    placeholder="https://..."
                  />
                  <p className="text-xs text-muted-foreground mt-1">Background image URL for login pages (recommended: 1920x1080)</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Colors Tab */}
          <TabsContent value="colors" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-3">
              {/* Light Mode Colors */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Light Mode</CardTitle>
                    <Badge variant="accent">Default</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="primaryColor">Primary Color</Label>
                    <div className="mt-1 flex items-center gap-2">
                      <input
                        type="color"
                        value={form.primaryColor}
                        onChange={(e) => handleChange('primaryColor', e.target.value)}
                        className="h-12 w-12 rounded border"
                      />
                      <Input
                        value={form.primaryColor}
                        onChange={(e) => handleChange('primaryColor', e.target.value)}
                        className="flex-1 font-mono"
                        onBlur={(e) => handleCopyColor(e.target.value)}
                      />
                      <Button variant="ghost" size="sm" onClick={() => handleCopyColor(form.primaryColor || '')}>Copy</Button>
                    </div>
                    <p className="text-xs text-muted-foreground">Used for primary buttons, links, and brand elements</p>
                  </div>
                  <div>
                    <Label htmlFor="secondaryColor">Secondary Color</Label>
                    <div className="mt-1 flex items-center gap-2">
                      <input
                        type="color"
                        value={form.secondaryColor}
                        onChange={(e) => handleChange('secondaryColor', e.target.value)}
                        className="h-12 w-12 rounded border"
                      />
                      <Input
                        value={form.secondaryColor}
                        onChange={(e) => handleChange('secondaryColor', e.target.value)}
                        className="flex-1 font-mono"
                        onBlur={(e) => handleCopyColor(e.target.value)}
                      />
                      <Button variant="ghost" size="sm" onClick={() => handleCopyColor(form.secondaryColor || '')}>Copy</Button>
                    </div>
                    <p className="text-xs text-muted-foreground">Used for secondary buttons, accents, and highlights</p>
                  </div>
                  <div>
                    <Label htmlFor="accentColor">Accent Color</Label>
                    <div className="mt-1 flex items-center gap-2">
                      <input
                        type="color"
                        value={form.accentColor}
                        onChange={(e) => handleChange('accentColor', e.target.value)}
                        className="h-12 w-12 rounded border"
                      />
                      <Input
                        value={form.accentColor}
                        onChange={(e) => handleChange('accentColor', e.target.value)}
                        className="flex-1 font-mono"
                        onBlur={(e) => handleCopyColor(e.target.value)}
                      />
                      <Button variant="ghost" size="sm" onClick={() => handleCopyColor(form.accentColor || '')}>Copy</Button>
                    </div>
                    <p className="text-xs text-muted-foreground">Used for success states, notifications, and call-to-action elements</p>
                  </div>
                </CardContent>
              </Card>

              {/* Dark Mode Colors */}
              <Card>
                <CardHeader>
                  <CardTitle>Dark Mode</CardTitle>
                  <p className="text-sm text-muted-foreground">Colors used when dark mode is enabled</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="darkModePrimary">Dark Mode Primary</Label>
                    <div className="mt-1 flex items-center gap-2">
                      <input
                        type="color"
                        value={form.darkModePrimary}
                        onChange={(e) => handleChange('darkModePrimary', e.target.value)}
                        className="h-12 w-12 rounded border"
                      />
                      <Input
                        value={form.darkModePrimary}
                        onChange={(e) => handleChange('darkModePrimary', e.target.value)}
                        className="flex-1 font-mono"
                        onBlur={(e) => handleCopyColor(e.target.value)}
                      />
                      <Button variant="ghost" size="sm" onClick={() => handleCopyColor(form.darkModePrimary || '')}>Copy</Button>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="darkModeSecondary">Dark Mode Secondary</Label>
                    <div className="mt-1 flex items-center gap-2">
                      <input
                        type="color"
                        value={form.darkModeSecondary}
                        onChange={(e) => handleChange('darkModeSecondary', e.target.value)}
                        className="h-12 w-12 rounded border"
                      />
                      <Input
                        value={form.darkModeSecondary}
                        onChange={(e) => handleChange('darkModeSecondary', e.target.value)}
                        className="flex-1 font-mono"
                        onBlur={(e) => handleCopyColor(e.target.value)}
                      />
                      <Button variant="ghost" size="sm" onClick={() => handleCopyColor(form.darkModeSecondary || '')}>Copy</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Color Palette Preview */}
              <Card>
                <CardHeader>
                  <CardTitle>Color Palette Preview</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="rounded-lg border p-4" style={{ backgroundColor: previewStyles.backgroundColor, color: previewStyles.color }}>
                    <div className="grid gap-4 md:grid-cols-4 mb-4">
                      <div className="rounded p-4 text-center" style={{ backgroundColor: previewStyles.primary, color: '#fff' }}>
                        <p className="text-xs font-medium">Primary</p>
                        <p className="font-mono text-sm">{previewStyles.primary}</p>
                      </div>
                      <div className="rounded p-4 text-center" style={{ backgroundColor: previewStyles.secondary, color: '#fff' }}>
                        <p className="text-xs font-medium">Secondary</p>
                        <p className="font-mono text-sm">{previewStyles.secondary}</p>
                      </div>
                      <div className="rounded p-4 text-center" style={{ backgroundColor: previewStyles.accent, color: '#fff' }}>
                        <p className="text-xs font-medium">Accent</p>
                        <p className="font-mono text-sm">{previewStyles.accent}</p>
                      </div>
                      <div className="rounded p-4 text-center" style={{ backgroundColor: isDark ? '#1e293b' : '#f8fafc', color: isDark ? '#fff' : '#000' }}>
                        <p className="text-xs font-medium">Background</p>
                        <p className="font-mono text-sm">{isDark ? '#0f172a' : '#ffffff'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => setPreviewMode('light')}>
                        <Sun className="h-4 w-4 mr-1" /> Light
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setPreviewMode('dark')}>
                        <Moon className="h-4 w-4 mr-1" /> Dark
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Preset Color Palettes */}
              <Card>
                <CardHeader>
                  <CardTitle>Preset Palettes</CardTitle>
                  <p className="text-sm text-muted-foreground">Quick-start color schemes</p>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-4">
                    {presetPalettes.map((palette) => (
                      <Button
                        key={palette.name}
                        variant="outline"
                        className="flex flex-col items-start gap-2 p-4 h-full"
                        onClick={() => {
                          handleChange('primaryColor', palette.primary);
                          handleChange('secondaryColor', palette.secondary);
                          handleChange('accentColor', palette.accent);
                        }}
                      >
                        <div className="flex gap-1">
                          <div className="w-8 h-8 rounded" style={{ backgroundColor: palette.primary }} />
                          <div className="w-8 h-8 rounded" style={{ backgroundColor: palette.secondary }} />
                          <div className="w-8 h-8 rounded" style={{ backgroundColor: palette.accent }} />
                        </div>
                        <span className="font-medium">{palette.name}</span>
                        <div className="flex gap-1 text-xs text-muted-foreground">
                          <span>{palette.primary}</span>
                          <span>{palette.secondary}</span>
                          <span>{palette.accent}</span>
                        </div>
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Assets Tab */}
          <TabsContent value="assets" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Logo</CardTitle>
                  <p className="text-sm text-muted-foreground">Main logo displayed in headers and login pages (recommended: SVG or 200x80px PNG)</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="relative w-48 h-48 rounded-lg border bg-muted/50 flex items-center justify-center overflow-hidden">
                      {form.logo ? (
                        <img src={form.logo} alt="Logo preview" className="w-full h-full object-contain" />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground">
                          <Image className="h-12 w-12 mb-2 opacity-50" />
                          <span className="text-sm">No logo uploaded</span>
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Input
                        value={form.logo}
                        onChange={(e) => handleChange('logo', e.target.value)}
                        placeholder="https://... or data:image/svg+xml,..."
                        className="flex-1"
                      />
                      <div className="flex gap-2">
                        <Button variant="outline"><Upload className="h-4 w-4 mr-1" />Upload Image</Button>
                        <Button variant="ghost" size="sm" onClick={() => handleChange('logo', '')}><Trash2 className="h-4 w-4" /> Remove</Button>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-lg border p-4 bg-muted/50">
                    <p className="font-medium mb-2">Preview</p>
                    <div className="flex items-center gap-3 rounded bg-white p-2" style={{ backgroundColor: form.primaryColor + '10' }}>
                      {form.logo ? (
                        <img src={form.logo} alt="Logo" className="h-8 w-auto" />
                      ) : (
                        <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center">
                          <Building2 className="h-5 w-5 text-primary" />
                        </div>
                      )}
                      <span className="font-medium" style={{ color: form.primaryColor }}>{form.schoolName || tenant?.name || 'School Name'}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Favicon</CardTitle>
                  <p className="text-sm text-muted-foreground">Browser tab icon (recommended: 32x32px ICO or PNG)</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="relative w-16 h-16 rounded border bg-muted/50 flex items-center justify-center">
                      {form.favicon ? (
                        <img src={form.favicon} alt="Favicon preview" className="w-full h-full object-contain" />
                      ) : (
                        <Building2 className="h-8 w-8 text-muted-foreground" />
                      )}
                    </div>
                    <div className="space-y-2">
                      <Input
                        value={form.favicon}
                        onChange={(e) => handleChange('favicon', e.target.value)}
                        placeholder="https://... or data:image/x-icon;base64,..."
                        className="flex-1"
                      />
                      <div className="flex gap-2">
                        <Button variant="outline"><Upload className="h-4 w-4 mr-1" />Upload</Button>
                        <Button variant="ghost" size="sm" onClick={() => handleChange('favicon', '')}><Trash2 className="h-4 w-4" /> Remove</Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Login Background</CardTitle>
                  <p className="text-sm text-muted-foreground">Background image for login pages (recommended: 1920x1080)</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Input
                    value={form.loginBackground}
                    onChange={(e) => handleChange('loginBackground', e.target.value)}
                    placeholder="https://... (leave blank for solid color)"
                  />
                  <div className="rounded-lg border p-4" style={{ backgroundImage: form.loginBackground ? `url(${form.loginBackground})` : 'none', backgroundColor: form.primaryColor, backgroundSize: 'cover', backgroundPosition: 'center', minHeight: '200px' }}>
                    <div className="h-full flex flex-col items-center justify-center text-white">
                      <Building2 className="h-16 w-16 mb-4 opacity-90" />
                      <h2 className="text-2xl font-bold">{form.schoolName || tenant?.name || 'School Name'}</h2>
                      <p className="mt-2 opacity-90">Login Page Preview</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Advanced Tab */}
          <TabsContent value="advanced" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Custom CSS</CardTitle>
                <p className="text-sm text-muted-foreground">Inject custom CSS for advanced styling (use with caution)</p>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg border p-4 font-mono text-sm bg-muted/50 max-h-96 overflow-auto">
                  <textarea
                    value={form.customCss || ''}
                    onChange={(e) => handleChange('customCss', e.target.value)}
                    placeholder="/* Custom CSS here */\n:root {\n  --radius: 0.5rem;\n}"
                    className="w-full h-96 font-mono text-sm bg-transparent border-none resize-none focus:outline-none"
                    spellCheck={false}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Dark Mode Colors</CardTitle>
                <p className="text-sm text-muted-foreground">Colors used when dark mode is enabled</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="darkModePrimary">Dark Mode Primary</Label>
                    <div className="mt-1 flex items-center gap-2">
                      <input
                        type="color"
                        value={form.darkModePrimary}
                        onChange={(e) => handleChange('darkModePrimary', e.target.value)}
                        className="h-12 w-12 rounded border"
                      />
                      <Input value={form.darkModePrimary} onChange={(e) => handleChange('darkModePrimary', e.target.value)} className="flex-1 font-mono" onBlur={(e) => handleCopyColor(e.target.value)} />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="darkModeSecondary">Dark Mode Secondary</Label>
                    <div className="mt-1 flex items-center gap-2">
                      <input
                        type="color"
                        value={form.darkModeSecondary}
                        onChange={(e) => handleChange('darkModeSecondary', e.target.value)}
                        className="h-12 w-12 rounded border"
                      />
                      <Input value={form.darkModeSecondary} onChange={(e) => handleChange('darkModeSecondary', e.target.value)} className="flex-1 font-mono" onBlur={(e) => handleCopyColor(e.target.value)} />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Custom Footer Text</CardTitle>
                <p className="text-sm text-muted-foreground">Displayed at the bottom of all pages</p>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="footerText">Footer Text</Label>
                    <Input id="footerText" value={form.footerText} onChange={(e) => handleChange('footerText', e.target.value)} placeholder="© 2024 School Name. All rights reserved." />
                  </div>
                  <div>
                    <Label htmlFor="tagline">Tagline / Motto</Label>
                    <Input id="tagline" value={form.tagline} onChange={(e) => handleChange('tagline', e.target.value)} placeholder="Excellence in Education" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-red-200 bg-red-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-800">
                  <AlertTriangle className="h-5 w-5" />
                  Danger Zone
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-red-700">These actions are irreversible. Proceed with caution.</p>
                <div className="flex gap-2">
                  <Button variant="destructive" onClick={handleReset}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Reset All Branding to Defaults
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

      </div>
    </>
  );
}