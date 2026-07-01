"use client";

import { useEffect, useState, useTransition, type RefObject } from "react";
import { useRouter } from "next/navigation";
import type { StatusBoard, StatusIncident, StatusMaintenance, StatusService } from "@prisma/client";
import { upsertStatusBoard } from "@/modules/status-page/actions";
import { useAdminFormOptional } from "@/components/admin/layout/admin-form-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AdminLocalizedFormField } from "@/features/translation/components/admin-localized-form-field";
import { NestedLocalizedRowInput } from "@/features/translation/components/nested-localized-row-field";
import type { StatusBoardFormDrafts } from "./status-board-form-data";

type BoardWithChildren = StatusBoard & {
  services: StatusService[];
  incidents: StatusIncident[];
  maintenance: StatusMaintenance[];
};

const EMPTY_SERVICE = {
  status: "OPERATIONAL",
  uptimePercent: 100,
};

const EMPTY_INCIDENT = {
  status: "INVESTIGATING",
  startedAt: new Date().toISOString().slice(0, 16),
  resolvedAt: "",
};

const EMPTY_MAINTENANCE = {
  startsAt: new Date().toISOString().slice(0, 16),
  endsAt: new Date(Date.now() + 3600000).toISOString().slice(0, 16),
};

export function StatusBoardForm({
  board,
  formDrafts,
  mode = board ? "edit" : "create",
  embedded = false,
  formRef,
}: {
  board?: BoardWithChildren | null;
  formDrafts?: StatusBoardFormDrafts;
  mode?: "create" | "edit";
  embedded?: boolean;
  formRef?: RefObject<HTMLFormElement | null>;
}) {
  const router = useRouter();
  const adminForm = useAdminFormOptional();
  const [pending, startTransition] = useTransition();
  const [services, setServices] = useState<Record<string, unknown>[]>(
    formDrafts?.services ?? []
  );
  const [incidents, setIncidents] = useState<Record<string, unknown>[]>(
    formDrafts?.incidents ?? []
  );
  const [maintenance, setMaintenance] = useState<Record<string, unknown>[]>(
    formDrafts?.maintenance ?? []
  );

  useEffect(() => {
    if (formDrafts) {
      setServices(formDrafts.services);
      setIncidents(formDrafts.incidents);
      setMaintenance(formDrafts.maintenance);
    }
  }, [formDrafts]);

  useEffect(() => {
    if (!embedded || !formRef?.current || !adminForm) return;
    const form = formRef.current;
    const markDirty = () => adminForm.setDirty(true);
    form.addEventListener("input", markDirty);
    form.addEventListener("change", markDirty);
    return () => {
      form.removeEventListener("input", markDirty);
      form.removeEventListener("change", markDirty);
    };
  }, [embedded, formRef, adminForm]);

  const handleSubmit = (formData: FormData) => {
    formData.set("servicesJson", JSON.stringify(services));
    formData.set("incidentsJson", JSON.stringify(incidents));
    formData.set("maintenanceJson", JSON.stringify(maintenance));
    startTransition(async () => {
      const saved = await upsertStatusBoard(formData);
      adminForm?.setDirty(false);
      if (mode === "create") router.push(`/admin/status/${saved.id}`);
      else {
        adminForm?.showToast("Status board saved", "success");
        router.refresh();
      }
    });
  };

  return (
    <form
      ref={formRef}
      onSubmit={(e) => {
        e.preventDefault();
        handleSubmit(new FormData(e.currentTarget));
      }}
      className="space-y-6"
    >
      {board && <input type="hidden" name="id" value={board.id} />}
      <input type="hidden" name="sortOrder" value={board?.sortOrder ?? 0} />

      <AdminLocalizedFormField
        fieldKey="title"
        label="Title"
        entityType="StatusBoard"
        entityId={board?.id}
        legacyEntity={formDrafts?.boardLegacy ?? board ?? undefined}
        required
      />
      <AdminLocalizedFormField
        fieldKey="description"
        label="Description"
        entityType="StatusBoard"
        entityId={board?.id}
        legacyEntity={formDrafts?.boardLegacy ?? board ?? undefined}
        multiline
        rows={3}
      />
      <div className="space-y-2">
        <Label htmlFor="slug">Slug</Label>
        <Input id="slug" name="slug" defaultValue={board?.slug ?? ""} placeholder="auto from title" />
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="isPublished" value="true" defaultChecked={board?.isPublished ?? true} />
        Published
      </label>

      <div className="space-y-3 rounded-lg border p-4">
        <div className="flex items-center justify-between">
          <h4 className="font-medium">Services</h4>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setServices((prev) => [...prev, { ...EMPTY_SERVICE }])}
          >
            Add service
          </Button>
        </div>
        {services.map((service, index) => (
          <div key={String(service.id ?? `svc-${index}`)} className="grid gap-2 rounded-md border p-3 md:grid-cols-2">
            <NestedLocalizedRowInput
              row={service}
              field="name"
              label="Name"
              onChange={(next) =>
                setServices((prev) => prev.map((s, i) => (i === index ? next : s)))
              }
            />
            <NestedLocalizedRowInput
              row={service}
              field="description"
              label="Description"
              multiline
              onChange={(next) =>
                setServices((prev) => prev.map((s, i) => (i === index ? next : s)))
              }
            />
            <select
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
              value={String(service.status ?? "OPERATIONAL")}
              onChange={(e) =>
                setServices((prev) =>
                  prev.map((s, i) => (i === index ? { ...s, status: e.target.value } : s))
                )
              }
            >
              <option value="OPERATIONAL">Operational</option>
              <option value="DEGRADED">Degraded</option>
              <option value="PARTIAL_OUTAGE">Partial outage</option>
              <option value="MAJOR_OUTAGE">Major outage</option>
              <option value="MAINTENANCE">Maintenance</option>
            </select>
            <Input
              type="number"
              step="0.01"
              placeholder="Uptime %"
              value={Number(service.uptimePercent ?? 100)}
              onChange={(e) =>
                setServices((prev) =>
                  prev.map((s, i) =>
                    i === index ? { ...s, uptimePercent: Number(e.target.value) } : s
                  )
                )
              }
            />
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setServices((prev) => prev.filter((_, i) => i !== index))}
            >
              Remove
            </Button>
          </div>
        ))}
      </div>

      <div className="space-y-3 rounded-lg border p-4">
        <div className="flex items-center justify-between">
          <h4 className="font-medium">Incidents</h4>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setIncidents((prev) => [...prev, { ...EMPTY_INCIDENT }])}
          >
            Add incident
          </Button>
        </div>
        {incidents.map((incident, index) => (
          <div key={String(incident.id ?? `inc-${index}`)} className="grid gap-2 rounded-md border p-3 md:grid-cols-2">
            <NestedLocalizedRowInput
              row={incident}
              field="title"
              label="Title"
              onChange={(next) =>
                setIncidents((prev) => prev.map((inc, i) => (i === index ? next : inc)))
              }
            />
            <NestedLocalizedRowInput
              row={incident}
              field="message"
              label="Message"
              multiline
              onChange={(next) =>
                setIncidents((prev) => prev.map((inc, i) => (i === index ? next : inc)))
              }
            />
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setIncidents((prev) => prev.filter((_, i) => i !== index))}
            >
              Remove
            </Button>
          </div>
        ))}
      </div>

      <div className="space-y-3 rounded-lg border p-4">
        <div className="flex items-center justify-between">
          <h4 className="font-medium">Maintenance</h4>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setMaintenance((prev) => [...prev, { ...EMPTY_MAINTENANCE }])}
          >
            Add maintenance
          </Button>
        </div>
        {maintenance.map((item, index) => (
          <div key={String(item.id ?? `mnt-${index}`)} className="grid gap-2 rounded-md border p-3 md:grid-cols-2">
            <NestedLocalizedRowInput
              row={item}
              field="title"
              label="Title"
              onChange={(next) =>
                setMaintenance((prev) => prev.map((m, i) => (i === index ? next : m)))
              }
            />
            <NestedLocalizedRowInput
              row={item}
              field="message"
              label="Message"
              multiline
              onChange={(next) =>
                setMaintenance((prev) => prev.map((m, i) => (i === index ? next : m)))
              }
            />
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setMaintenance((prev) => prev.filter((_, i) => i !== index))}
            >
              Remove
            </Button>
          </div>
        ))}
      </div>

      {!embedded ? (
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : mode === "create" ? "Create" : "Save"}
        </Button>
      ) : null}
    </form>
  );
}
