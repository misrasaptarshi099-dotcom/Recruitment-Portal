"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ArrowRight, Info } from "lucide-react";

const PopupComp = ({ isOpen, onClose, PopupData }) => {
  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <div className="flex items-center gap-2 text-primary font-semibold">
            <Info className="h-5 w-5 text-blue-500" />
            <DialogTitle className="text-lg">{PopupData?.header || "Notice"}</DialogTitle>
          </div>
          {PopupData?.description && (
            <DialogDescription className="text-muted-foreground pt-1">
              {PopupData.description}
            </DialogDescription>
          )}
        </DialogHeader>

        {PopupData?.message && Array.isArray(PopupData.message) && (
          <ul className="space-y-2 py-3 text-sm text-muted-foreground">
            {PopupData.message.map((msg, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-500 mt-2 shrink-0" />
                <span>{msg}</span>
              </li>
            ))}
          </ul>
        )}

        <div className="flex justify-end pt-2">
          <Button onClick={onClose} className="rounded-full gap-1 px-5">
            <span>Got it</span>
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PopupComp;
