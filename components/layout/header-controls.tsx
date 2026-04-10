"use client";

import { useEffect, useMemo, useState } from "react";
import { Headset } from "lucide-react";
import { SupportModal } from "@/components/shared/support-modal";
import { Button } from "@/components/ui/button";

interface HeaderControlsProps {
  displayName: string;
  email: string;
}

export function HeaderControls({ displayName, email }: HeaderControlsProps) {
  const [isSupportOpen, setIsSupportOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(() =>
    new Date().toLocaleTimeString("es-CL", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })
  );

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setCurrentTime(
        new Date().toLocaleTimeString("es-CL", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        })
      );
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, []);

  const labelName = useMemo(() => displayName.trim() || email, [displayName, email]);

  return (
    <>
      <div className="hidden text-right sm:block">
        <p className="text-sm font-semibold text-[var(--tazki-slate-950)]">{labelName}</p>
        <p className="text-xs text-[var(--tazki-slate-500)]">{currentTime}</p>
      </div>

      <Button type="button" variant="outline" size="sm" className="gap-2" onClick={() => setIsSupportOpen(true)}>
        <Headset className="h-4 w-4" />
        Soporte
      </Button>

      <SupportModal
        isOpen={isSupportOpen}
        onClose={() => setIsSupportOpen(false)}
        userEmail={email}
        userName={labelName}
      />
    </>
  );
}
