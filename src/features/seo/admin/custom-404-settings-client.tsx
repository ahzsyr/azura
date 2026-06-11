"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { upsertCustom404Action } from "@/features/seo/actions";
import { useAdminUiStore } from "@/stores/admin-ui-store";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Custom404Row = {
  locale: string;
  titleEn: string;
  titleAr: string;
  bodyEn: string;
  bodyAr: string;
};

type LocaleForm = {
  locale: "en" | "ar";
  titleEn: string;
  titleAr: string;
  bodyEn: string;
  bodyAr: string;
};

const DEFAULTS: Record<"en" | "ar", Omit<LocaleForm, "locale">> = {
  en: {
    titleEn: "Page not found",
    titleAr: "الصفحة غير موجودة",
    bodyEn: "",
    bodyAr: "",
  },
  ar: {
    titleEn: "Page not found",
    titleAr: "الصفحة غير موجودة",
    bodyEn: "",
    bodyAr: "",
  },
};

function rowToForm(row: Custom404Row | undefined, locale: "en" | "ar"): LocaleForm {
  if (!row) {
    return { locale, ...DEFAULTS[locale] };
  }
  return {
    locale,
    titleEn: row.titleEn,
    titleAr: row.titleAr,
    bodyEn: row.bodyEn,
    bodyAr: row.bodyAr,
  };
}

type Props = {
  pages: Custom404Row[];
};

export function Custom404SettingsClient({ pages }: Props) {
  const initialEn = rowToForm(pages.find((p) => p.locale === "en"), "en");
  const initialAr = rowToForm(pages.find((p) => p.locale === "ar"), "ar");
  const [enForm, setEnForm] = useState(initialEn);
  const [arForm, setArForm] = useState(initialAr);
  const [savedEn, setSavedEn] = useState(initialEn);
  const [savedAr, setSavedAr] = useState(initialAr);
  const registerPageActions = useAdminUiStore((s) => s.registerPageActions);
  const clearPageActions = useAdminUiStore((s) => s.clearPageActions);
  const markUnsaved = useAdminUiStore((s) => s.markUnsaved);
  const markSaved = useAdminUiStore((s) => s.markSaved);
  const setSaveStatus = useAdminUiStore((s) => s.setSaveStatus);
  const savingRef = useRef(false);

  const patchEn = useCallback(
    (patch: Partial<LocaleForm>) => {
      markUnsaved();
      setEnForm((prev) => ({ ...prev, ...patch }));
    },
    [markUnsaved],
  );

  const patchAr = useCallback(
    (patch: Partial<LocaleForm>) => {
      markUnsaved();
      setArForm((prev) => ({ ...prev, ...patch }));
    },
    [markUnsaved],
  );

  const submitLocale = async (form: LocaleForm) => {
    const fd = new FormData();
    fd.set("locale", form.locale);
    fd.set("titleEn", form.titleEn);
    fd.set("titleAr", form.titleAr);
    fd.set("bodyEn", form.bodyEn);
    fd.set("bodyAr", form.bodyAr);
    fd.set("blocks", "[]");
    await upsertCustom404Action(fd);
  };

  const handleSave = useCallback(async () => {
    if (savingRef.current) return false;
    savingRef.current = true;
    setSaveStatus("saving");
    try {
      await submitLocale(enForm);
      await submitLocale(arForm);
      setSavedEn(enForm);
      setSavedAr(arForm);
      markSaved();
      return true;
    } catch {
      setSaveStatus("error");
      return false;
    } finally {
      savingRef.current = false;
    }
  }, [arForm, enForm, markSaved, setSaveStatus]);

  const handleCancel = useCallback(() => {
    setEnForm(savedEn);
    setArForm(savedAr);
  }, [savedAr, savedEn]);

  useEffect(() => {
    registerPageActions({
      onSave: handleSave,
      onCancel: handleCancel,
      selfManagedSaveStatus: true,
    });
    return () => clearPageActions();
  }, [registerPageActions, clearPageActions, handleSave, handleCancel]);

  return (
    <div className="space-y-8 max-w-xl">
      <h1 className="text-2xl font-bold">404 Page Manager</h1>

      {(["en", "ar"] as const).map((locale) => {
        const form = locale === "en" ? enForm : arForm;
        const patch = locale === "en" ? patchEn : patchAr;

        return (
          <div key={locale} className="border rounded-lg p-4 space-y-4">
            <h2 className="font-semibold uppercase">{locale}</h2>
            <div>
              <Label>Title EN</Label>
              <Input
                value={form.titleEn}
                onChange={(e) => patch({ titleEn: e.target.value })}
                required
              />
            </div>
            <div>
              <Label>Title AR</Label>
              <Input
                value={form.titleAr}
                onChange={(e) => patch({ titleAr: e.target.value })}
                dir="rtl"
                required
              />
            </div>
            <div>
              <Label>Body EN</Label>
              <Textarea
                value={form.bodyEn}
                onChange={(e) => patch({ bodyEn: e.target.value })}
                rows={3}
                required
              />
            </div>
            <div>
              <Label>Body AR</Label>
              <Textarea
                value={form.bodyAr}
                onChange={(e) => patch({ bodyAr: e.target.value })}
                dir="rtl"
                rows={3}
                required
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
