"use client";

import { useEffect, useState, useTransition, type RefObject } from "react";
import { useRouter } from "next/navigation";
import type { StatusBoard, StatusIncident, StatusMaintenance, StatusService } from "@prisma/client";
import { upsertStatusBoard } from "@/features/status/actions";
import { useAdminFormOptional } from "@/components/admin/layout/admin-form-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AdminLocalizedFormField } from "@/features/translation/components/admin-localized-form-field";

type BoardWithChildren = StatusBoard & {
  services: StatusService[];
  incidents: StatusIncident[];
  maintenance: StatusMaintenance[];
};

type ServiceDraft = {
  id?: string;
  nameEn: string;
  nameAr: string;
  descriptionEn: string;
  descriptionAr: string;
  status: string;
  uptimePercent: number;
};

type IncidentDraft = {
  id?: string;
  titleEn: string;
  titleAr: string;
  messageEn: string;
  messageAr: string;
  status: string;
  startedAt: string;
  resolvedAt: string;
};

type MaintenanceDraft = {
  id?: string;
  titleEn: string;
  titleAr: string;
  messageEn: string;
  messageAr: string;
  startsAt: string;
  endsAt: string;
};

export function StatusBoardForm({
  board,
  mode = board ? "edit" : "create",
  embedded = false,
  formRef,
}: {
  board?: BoardWithChildren | null;
  mode?: "create" | "edit";
  embedded?: boolean;
  formRef?: RefObject<HTMLFormElement | null>;
}) {
  const router = useRouter();
  const adminForm = useAdminFormOptional();
  const [pending, startTransition] = useTransition();
  const [services, setServices] = useState<ServiceDraft[]>(
    board?.services.map((s) => ({
      id: s.id,
      nameEn: s.nameEn,
      nameAr: s.nameAr,
      descriptionEn: s.descriptionEn,
      descriptionAr: s.descriptionAr,
      status: s.status,
      uptimePercent: Number(s.uptimePercent),
    })) ?? []
  );
  const [incidents, setIncidents] = useState<IncidentDraft[]>(
    board?.incidents.map((i) => ({
      id: i.id,
      titleEn: i.titleEn,
      titleAr: i.titleAr,
      messageEn: i.messageEn,
      messageAr: i.messageAr,
      status: i.status,
      startedAt: i.startedAt.toISOString().slice(0, 16),
      resolvedAt: i.resolvedAt?.toISOString().slice(0, 16) ?? "",
    })) ?? []
  );
  const [maintenance, setMaintenance] = useState<MaintenanceDraft[]>(
    board?.maintenance.map((m) => ({
      id: m.id,
      titleEn: m.titleEn,
      titleAr: m.titleAr,
      messageEn: m.messageEn,
      messageAr: m.messageAr,
      startsAt: m.startsAt.toISOString().slice(0, 16),
      endsAt: m.endsAt.toISOString().slice(0, 16),
    })) ?? []
  );

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

      <AdminLocalizedFormField fieldKey="title" label="Title" legacyEntity={board ?? undefined} required />
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
            onClick={() =>
              setServices((prev) => [
                ...prev,
                {
                  nameEn: "",
                  nameAr: "",
                  descriptionEn: "",
                  descriptionAr: "",
                  status: "OPERATIONAL",
                  uptimePercent: 100,
                },
              ])
            }
          >
            Add service
          </Button>
        </div>
        {services.map((service, index) => (
          <div key={service.id ?? `svc-${index}`} className="grid gap-2 rounded-md border p-3 md:grid-cols-2">
            <Input
              placeholder="Name EN"
              value={service.nameEn}
              onChange={(e) =>
                setServices((prev) => prev.map((s, i) => (i === index ? { ...s, nameEn: e.target.value } : s)))
              }
            />
            <Input
              placeholder="Name AR"
              dir="rtl"
              value={service.nameAr}
              onChange={(e) =>
                setServices((prev) => prev.map((s, i) => (i === index ? { ...s, nameAr: e.target.value } : s)))
              }
            />
            <select
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
              value={service.status}
              onChange={(e) =>
                setServices((prev) => prev.map((s, i) => (i === index ? { ...s, status: e.target.value } : s)))
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
              value={service.uptimePercent}
              onChange={(e) =>
                setServices((prev) =>
                  prev.map((s, i) => (i === index ? { ...s, uptimePercent: Number(e.target.value) } : s))
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
            onClick={() =>
              setIncidents((prev) => [
                ...prev,
                {
                  titleEn: "",
                  titleAr: "",
                  messageEn: "",
                  messageAr: "",
                  status: "INVESTIGATING",
                  startedAt: new Date().toISOString().slice(0, 16),
                  resolvedAt: "",
                },
              ])
            }
          >
            Add incident
          </Button>
        </div>
        {incidents.map((incident, index) => (
          <div key={incident.id ?? `inc-${index}`} className="grid gap-2 rounded-md border p-3 md:grid-cols-2">
            <Input
              placeholder="Title EN"
              value={incident.titleEn}
              onChange={(e) =>
                setIncidents((prev) => prev.map((inc, i) => (i === index ? { ...inc, titleEn: e.target.value } : inc)))
              }
            />
            <Input
              placeholder="Message EN"
              value={incident.messageEn}
              onChange={(e) =>
                setIncidents((prev) =>
                  prev.map((inc, i) => (i === index ? { ...inc, messageEn: e.target.value } : inc))
                )
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
            onClick={() =>
              setMaintenance((prev) => [
                ...prev,
                {
                  titleEn: "",
                  titleAr: "",
                  messageEn: "",
                  messageAr: "",
                  startsAt: new Date().toISOString().slice(0, 16),
                  endsAt: new Date(Date.now() + 3600000).toISOString().slice(0, 16),
                },
              ])
            }
          >
            Add maintenance
          </Button>
        </div>
        {maintenance.map((item, index) => (
          <div key={item.id ?? `mnt-${index}`} className="grid gap-2 rounded-md border p-3 md:grid-cols-2">
            <Input
              placeholder="Title EN"
              value={item.titleEn}
              onChange={(e) =>
                setMaintenance((prev) => prev.map((m, i) => (i === index ? { ...m, titleEn: e.target.value } : m)))
              }
            />
            <Input
              placeholder="Message EN"
              value={item.messageEn}
              onChange={(e) =>
                setMaintenance((prev) =>
                  prev.map((m, i) => (i === index ? { ...m, messageEn: e.target.value } : m))
                )
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
