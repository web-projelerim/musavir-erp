"use client";

import { useCallback } from "react";
import { useAuth } from "@/lib/context/AuthContext";
import { isFirebaseConfigured } from "@/lib/firebase/client";
import { createAuditLog } from "@/lib/firebase/repositories";
import type { AuditAction, AuditEntityType } from "@/lib/types";

interface AuditLogInput {
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: string;
  entityLabel?: string;
  summary: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
}

export function useAuditLog() {
  const { user } = useAuth();

  return useCallback(
    async (input: AuditLogInput) => {
      if (!isFirebaseConfigured) return;

      try {
        await createAuditLog({
          ofisId: user?.ofisId,
          actorId: user?.id ?? "system",
          actorName: user ? `${user.ad} ${user.soyad}`.trim() || user.email : "Sistem",
          actorRole: user?.rol ?? "system",
          ...input,
        });
      } catch (error) {
        console.error("[AuditLog] kayit yazilamadi", error);
      }
    },
    [user]
  );
}
