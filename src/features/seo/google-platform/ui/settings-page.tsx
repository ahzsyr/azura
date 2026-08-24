"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { GoogleGlobalSettings } from "../types";
import {
  upsertGoogleGlobalSettingsAction,
  type GooglePlatformActionResult,
} from "../actions";

export function GoogleGlobalSettingsPage({ settings }: { settings: GoogleGlobalSettings }) {
  const [state, action, pending] = useActionState(upsertGoogleGlobalSettingsAction, null);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Google Settings</h2>
        <p className="text-sm text-muted-foreground">
          Shared defaults inherited by all Google integrations: OAuth clients, workers, retries, and notifications.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Global defaults</CardTitle>
          <CardDescription>Configuration inheritance layer for every Google service.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={action} className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor="defaultCloudProjectId">Default Google Cloud project</Label>
              <Input
                id="defaultCloudProjectId"
                name="defaultCloudProjectId"
                defaultValue={settings.defaultCloudProjectId ?? ""}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="oauthClientId">OAuth client ID</Label>
              <Input id="oauthClientId" name="oauthClientId" defaultValue={settings.oauthClientId ?? ""} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="oauthClientSecret">OAuth client secret</Label>
              <Input
                id="oauthClientSecret"
                name="oauthClientSecret"
                type="password"
                placeholder={settings.oauthClientId ? "•••• saved — leave blank to keep" : undefined}
              />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor="sharedServiceAccountJson">Shared service account JSON</Label>
              <Textarea
                id="sharedServiceAccountJson"
                name="sharedServiceAccountJson"
                rows={5}
                placeholder="Paste service account JSON (leave blank to keep existing)"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="secretRotationDays">Secret rotation (days)</Label>
              <Input
                id="secretRotationDays"
                name="secretRotationDays"
                type="number"
                defaultValue={settings.secretRotationDays ?? 90}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="globalRateLimitPerMinute">Global rate limit / minute</Label>
              <Input
                id="globalRateLimitPerMinute"
                name="globalRateLimitPerMinute"
                type="number"
                defaultValue={settings.globalRateLimitPerMinute ?? 120}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="retryCount">Default retry count</Label>
              <Input
                id="retryCount"
                name="retryCount"
                type="number"
                defaultValue={settings.defaultRetryPolicy.retryCount}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="retryBackoffMs">Default retry backoff (ms)</Label>
              <Input
                id="retryBackoffMs"
                name="retryBackoffMs"
                type="number"
                defaultValue={settings.defaultRetryPolicy.retryBackoffMs}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="parallelRequests">Default parallel requests</Label>
              <Input
                id="parallelRequests"
                name="parallelRequests"
                type="number"
                defaultValue={settings.defaultWorkerPolicy.parallelRequests}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="timeoutMs">Default timeout (ms)</Label>
              <Input
                id="timeoutMs"
                name="timeoutMs"
                type="number"
                defaultValue={settings.defaultWorkerPolicy.timeoutMs}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="loggingRetentionDays">Logging retention (days)</Label>
              <Input
                id="loggingRetentionDays"
                name="loggingRetentionDays"
                type="number"
                defaultValue={settings.loggingRetentionDays ?? 30}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="defaultTimeoutMs">Default timeout fallback (ms)</Label>
              <Input
                id="defaultTimeoutMs"
                name="defaultTimeoutMs"
                type="number"
                defaultValue={settings.defaultTimeoutMs ?? 30000}
              />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor="notificationChannels">Notification channels (comma-separated)</Label>
              <Input
                id="notificationChannels"
                name="notificationChannels"
                defaultValue={(settings.notificationChannels ?? []).join(", ")}
                placeholder="ops@example.com, #seo-alerts"
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="workerEnabled"
                value="true"
                defaultChecked={settings.defaultWorkerPolicy.workerEnabled}
              />
              Default workers enabled
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="environmentValidated"
                value="true"
                defaultChecked={Boolean(settings.environmentValidated)}
              />
              Environment validated
            </label>
            <div className="sm:col-span-2 space-y-2">
              <Button type="submit" disabled={pending}>
                Save Google settings
              </Button>
              {state ? (
                <p className={`text-sm ${state.ok ? "text-emerald-700" : "text-destructive"}`}>
                  {(state as GooglePlatformActionResult).message}
                </p>
              ) : null}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
