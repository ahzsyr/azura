import { useStore } from "@nanostores/react";
import { useEffect, useState } from "react";
import type { HeaderAction, HeaderActionType, ActionStyle } from "@/features/navigation/types";
import {
  $workspace,
  generateActionId,
  removeAction,
  toggleActionVisibility,
  upsertAction,
} from "@/features/navigation/header-store";
import { getActionTypeLabel, normalizeAction } from "@/features/navigation/menu-engine";
import { AdminCollapsibleSection } from "@/components/admin/layout/admin-collapsible-section";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HeaderField, HeaderSelect } from "./header-builder-ui";

function emptyForm() {
  return {
    type: "custom" as HeaderActionType,
    label: "Store",
    icon: "fa-store",
    href: "/products",
    style: "solid" as ActionStyle,
    outlined: false,
    visible: true,
  };
}

export function ActionsManager() {
  const workspace = useStore($workspace);
  const actions = workspace.headerActions;
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (editingId) {
      const a = actions.find((x) => x.id === editingId);
      if (a) {
        setForm({
          type: a.type,
          label: a.label,
          icon: a.icon,
          href: a.href ?? "",
          style: a.style,
          outlined: a.outlined,
          visible: a.visible,
        });
      }
    } else {
      setForm(emptyForm());
    }
  }, [editingId, actions]);

  const save = () => {
    if (form.type === "custom" && !form.href.trim()) {
      setFormError("Link URL is required for custom buttons.");
      return;
    }
    setFormError(null);
    const payload: HeaderAction = normalizeAction({
      id: editingId ?? generateActionId(),
      type: form.type,
      label: form.label.trim(),
      icon: form.icon.trim(),
      href: form.type === "custom" ? form.href.trim() : undefined,
      style: form.style,
      outlined: form.outlined,
      visible: form.visible,
    });
    upsertAction(payload);
    setEditingId(null);
    setForm(emptyForm());
  };

  const reset = () => {
    setEditingId(null);
    setForm(emptyForm());
    setFormError(null);
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Manage header action buttons: edit, delete, hide/show, and add with custom style.
      </p>

      <AdminCollapsibleSection title="Current actions" defaultOpen>
        {actions.length === 0 ? (
          <p className="text-sm text-muted-foreground">No actions configured.</p>
        ) : (
          <div className="space-y-2">
            {actions.map((action) => (
              <div
                key={action.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card p-3"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-sm">{action.label}</span>
                    <Badge variant="secondary">{getActionTypeLabel(action.type)}</Badge>
                    <Badge variant="outline">{action.style}</Badge>
                    {!action.visible ? <Badge variant="outline">Hidden</Badge> : null}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Icon: {action.icon}
                    {action.outlined ? " · outlined" : ""}
                    {action.type === "custom" && action.href ? ` · Link: ${action.href}` : ""}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" size="sm" variant="outline" onClick={() => setEditingId(action.id)}>
                    Edit
                  </Button>
                  <Button type="button" size="sm" variant="outline" onClick={() => toggleActionVisibility(action.id)}>
                    {action.visible ? "Hide" : "Show"}
                  </Button>
                  <Button type="button" size="sm" variant="destructive" onClick={() => removeAction(action.id)}>
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </AdminCollapsibleSection>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{editingId ? "Edit action" : "Add action"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <HeaderField label="Action type" htmlFor="act-type">
              <HeaderSelect
                id="act-type"
                value={form.type}
                onChange={(v) => setForm((f) => ({ ...f, type: v as HeaderActionType }))}
              >
                <option value="search">Search</option>
                <option value="account">Account</option>
                <option value="language">Language</option>
                <option value="custom">Custom button</option>
              </HeaderSelect>
            </HeaderField>
            <HeaderField label="Label" htmlFor="act-label">
              <Input
                id="act-label"
                value={form.label}
                onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
              />
            </HeaderField>
            <HeaderField label="Icon (Font Awesome class)" htmlFor="act-icon">
              <Input
                id="act-icon"
                value={form.icon}
                onChange={(e) => setForm((f) => ({ ...f, icon: e.target.value }))}
                placeholder="fa-search"
              />
            </HeaderField>
            <HeaderField label="Style" htmlFor="act-style">
              <HeaderSelect
                id="act-style"
                value={form.style}
                onChange={(v) => setForm((f) => ({ ...f, style: v as ActionStyle }))}
              >
                <option value="icon">Icon</option>
                <option value="solid">Solid</option>
                <option value="outline">Outline</option>
                <option value="ghost">Ghost</option>
              </HeaderSelect>
            </HeaderField>
            {form.type === "custom" ? (
              <HeaderField label="Link URL" htmlFor="act-href" className="sm:col-span-2">
                <Input
                  id="act-href"
                  value={form.href}
                  onChange={(e) => {
                    setFormError(null);
                    setForm((f) => ({ ...f, href: e.target.value }));
                  }}
                  placeholder="/products or https://example.com"
                />
              </HeaderField>
            ) : null}
          </div>
          {formError ? <p className="text-sm text-destructive">{formError}</p> : null}
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.outlined}
                onChange={(e) => setForm((f) => ({ ...f, outlined: e.target.checked }))}
              />
              Outline accent border
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.visible}
                onChange={(e) => setForm((f) => ({ ...f, visible: e.target.checked }))}
              />
              Visible in header
            </label>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={save}>
              {editingId ? "Update action" : "Add action"}
            </Button>
            <Button type="button" variant="outline" onClick={reset}>
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
