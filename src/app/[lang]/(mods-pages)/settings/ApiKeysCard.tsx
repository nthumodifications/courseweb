// filepath: src/app/[lang]/(mods-pages)/settings/ApiKeysCard.tsx
"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "react-oidc-context";
import useDictionary from "@/dictionaries/useDictionary";
import { CalendarShareDialog } from "@/components/Calendar/CalendarShareDialog";

export default function ApiKeysCard() {
  const auth = useAuth();
  const dict = useDictionary();

  return (
    <Card>
      <CardHeader>
        <CardTitle>{dict.settings.api_keys?.title || "API Keys"}</CardTitle>
        <CardDescription>
          {dict.settings.api_keys?.description ||
            "Manage API keys for sharing your calendar with external applications"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-row gap-4 py-4">
          <div className="flex flex-col flex-1 gap-1">
            <h2 className="font-semibold text-base">
              {dict.settings.api_keys?.manage_title || "Manage API Keys"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {dict.settings.api_keys?.manage_description ||
                "Create and manage API keys to share your calendar"}
            </p>
          </div>
          <div className="flex items-center">
            <CalendarShareDialog />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
