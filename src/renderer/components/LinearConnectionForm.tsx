import React, { useState, useEffect } from 'react';
import { Check, AlertCircle } from 'lucide-react';

export function LinearConnectionForm() {
  const [enabled, setEnabled] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [configured, setConfigured] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [teamKey, setTeamKey] = useState('');
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);

  useEffect(() => {
    window.electronAPI.linearCheckConfigured().then((resp) => {
      if (resp.success && resp.data) {
        setEnabled(true);
        setConfigured(true);
        window.electronAPI.linearGetConfig().then((cfgResp) => {
          if (cfgResp.success && cfgResp.data) {
            setApiKey(cfgResp.data.apiKey);
            setTeamKey(cfgResp.data.teamKey ?? '');
          }
        });
      }
    });
  }, []);

  async function handleToggle() {
    if (enabled) {
      await window.electronAPI.linearRemoveConfig();
      setApiKey('');
      setTeamKey('');
      setTestResult(null);
      setConfigured(false);
      setExpanded(false);
      setEnabled(false);
    } else {
      setEnabled(true);
      setExpanded(true);
    }
  }

  async function handleTest() {
    if (!apiKey.trim()) return;
    setTesting(true);
    setTestResult(null);
    try {
      const resp = await window.electronAPI.linearTestConnection(apiKey.trim());
      setTestResult(resp.success && resp.data ? 'success' : 'error');
    } catch {
      setTestResult('error');
    } finally {
      setTesting(false);
    }
  }

  async function handleSave() {
    if (!apiKey.trim()) return;
    setSaving(true);
    try {
      await window.electronAPI.linearSaveConfig(apiKey.trim(), teamKey.trim() || undefined);
      setConfigured(true);
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  }

  const canSubmit = apiKey.trim().length > 0;

  return (
    <div
      className="rounded-xl border border-border/40"
      style={{ background: 'hsl(var(--surface-2))' }}
    >
      <div className="flex items-center gap-3.5 w-full p-4">
        <button
          type="button"
          onClick={() => {
            if (enabled) setExpanded(!expanded);
          }}
          className={`flex items-center gap-3.5 flex-1 min-w-0 text-left ${enabled ? 'cursor-pointer' : 'cursor-default'}`}
        >
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
              configured ? 'bg-[hsl(var(--git-added)/0.12)]' : 'bg-accent/60'
            }`}
          >
            {configured ? (
              <Check size={14} className="text-[hsl(var(--git-added))]" strokeWidth={2.5} />
            ) : (
              <AlertCircle size={14} className="text-muted-foreground/40" strokeWidth={2} />
            )}
          </div>
          <div className="min-w-0">
            <p className="text-[13px] font-medium text-foreground/90">Linear</p>
            <p className="text-[11px] text-foreground/50">
              {configured ? 'Connected' : 'Not configured'}
            </p>
          </div>
        </button>
        <button type="button" onClick={handleToggle} className="flex-shrink-0">
          <div
            className={`w-8 h-[18px] rounded-full relative transition-colors duration-150 ${
              enabled ? 'bg-primary' : 'bg-border'
            }`}
          >
            <div
              className={`absolute top-[2px] w-[14px] h-[14px] rounded-full bg-white shadow-sm transition-transform duration-150 ${
                enabled ? 'translate-x-[16px]' : 'translate-x-[2px]'
              }`}
            />
          </div>
        </button>
      </div>

      <div
        className="grid transition-[grid-template-rows] duration-200 ease-in-out"
        style={{ gridTemplateRows: expanded ? '1fr' : '0fr' }}
      >
        <div className="overflow-hidden">
          <div className="px-4 pb-4 space-y-2.5">
            <div>
              <label className="block text-[11px] text-muted-foreground/60 mb-1">API Key</label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => {
                  setApiKey(e.target.value);
                  setTestResult(null);
                }}
                placeholder="lin_api_..."
                className="w-full px-3 py-2 rounded-lg bg-background border border-input/60 text-[12px] font-mono text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring/50 transition-all duration-150"
              />
            </div>
            <div>
              <label className="block text-[11px] text-muted-foreground/60 mb-1">
                Team key <span className="text-muted-foreground/40">(optional)</span>
              </label>
              <input
                type="text"
                value={teamKey}
                onChange={(e) => setTeamKey(e.target.value)}
                placeholder="e.g. TSC"
                className="w-full px-3 py-2 rounded-lg bg-background border border-input/60 text-[12px] font-mono text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring/50 transition-all duration-150"
              />
              <p className="text-[10px] text-muted-foreground/40 mt-1">
                Scopes issue search to a specific team
              </p>
            </div>

            {testResult && (
              <div
                className={`px-3 py-2 rounded-lg text-[11px] ${
                  testResult === 'success'
                    ? 'bg-[hsl(var(--git-added)/0.1)] text-[hsl(var(--git-added))]'
                    : 'bg-destructive/10 text-destructive'
                }`}
              >
                {testResult === 'success' ? 'Connection successful' : 'Connection failed'}
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                disabled={!canSubmit || testing}
                onClick={handleTest}
                className="px-3 py-1.5 rounded-lg text-[11px] font-medium border border-border/60 text-foreground/70 hover:bg-accent/40 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-150"
              >
                {testing ? 'Testing...' : 'Test Connection'}
              </button>
              <button
                type="button"
                disabled={!canSubmit || saving}
                onClick={handleSave}
                className="px-3 py-1.5 rounded-lg text-[11px] font-medium bg-primary text-primary-foreground hover:brightness-110 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-150"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
