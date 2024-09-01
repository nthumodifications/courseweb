"use client";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useHeadlessAIS } from "@/hooks/contexts/useHeadlessAIS";
import {
  getDoorAccessQR,
  getOSAAccessToken,
  getOSACode,
  getParcelInformation,
} from "@/lib/headless_ais/inthu";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { QRCodeSVG } from "qrcode.react";
import Barcode from "react-barcode";

const StudentIDPage = () => {
  const [tab, setTab] = useState("door");
  const { ais, getACIXSTORE, user } = useHeadlessAIS();

  const {
    data: refresh,
    error: refreshError,
    isLoading: refreshLoading,
  } = useQuery({
    queryKey: ["osa_refreshtoken", user?.studentid],
    queryFn: async () => {
      const ACIXSTORE = await getACIXSTORE();
      if (!ACIXSTORE) {
        throw new Error("Failed to get token");
      }
      const res = await getOSACode(ACIXSTORE);
      if (!res) {
        throw new Error("Failed to get token");
      }
      return res;
    },
    // expire after 1 day
    staleTime: 86400000,
    // don't retry on error
    retry: false,
  });
  const {
    data: token,
    error: tokenError,
    isLoading: tokenLoading,
  } = useQuery({
    queryKey: ["osa_accesstoken", refresh?.user_id],
    queryFn: async () => {
      if (!refresh) {
        throw new Error("Refresh token not found");
      }
      const access = await getOSAAccessToken(
        refresh.user_id,
        refresh.refreshToken,
      );
      if (!access) {
        throw new Error("Failed to get token");
      }
      return { ...access, user_id: refresh.user_id };
    },
    // refresh every 1 hour
    refetchInterval: 3600000,
    enabled: !!refresh,
    // don't retry on error
    retry: false,
  });

  const {
    data: qrString,
    error,
    isLoading,
  } = useQuery({
    queryKey: ["parcels", token?.user_id],
    queryFn: async () => {
      if (!token) {
        throw new Error("Token not found");
      }
      const data = await getDoorAccessQR(
        token.authToken,
        token.deviceId,
        token.session_id,
      );
      return data;
    },
    enabled: !!token && tab === "door",
    // refresh only every 10 sec
    refetchInterval: 10000,
    // don't retry on error
    retry: false,
  });

  const isLoadingStuff = refreshLoading || tokenLoading || isLoading;

  return (
    <div className="flex flex-col px-4">
      <div className="flex flex-col gap-2">
        <div className="">
          <h1 className="text-xl font-bold">國立清華大學</h1>
        </div>
        <Tabs defaultValue="door" value={tab} onValueChange={setTab}>
          <div className="flex flex-col gap-2">
            <TabsContent value="door">
              <div className="flex flex-col items-center">
                {isLoadingStuff || !qrString ? (
                  <Skeleton className="h-60 w-60"></Skeleton>
                ) : (
                  <img
                    src={qrString}
                    alt="door access qr"
                    className="w-60 h-60"
                  />
                )}
              </div>
            </TabsContent>
            <TabsContent value="studentid">
              {user?.studentid ? (
                <div className="flex flex-col items-center gap-4">
                  <Barcode
                    width={2}
                    height={44}
                    value={user.studentid}
                    displayValue={false}
                  />
                  <QRCodeSVG className="h-40 w-40" value={user.studentid} />
                </div>
              ) : (
                <div className="flex flex-col items-center gap-4">
                  <Skeleton className="h-16 w-60"></Skeleton>
                  <Skeleton className="h-40 w-40"></Skeleton>
                </div>
              )}
            </TabsContent>
            <TabsList className="w-full justify-evenly mb-4 fixed md:relative bottom-16 md:bottom-auto left-0 md:left-auto">
              <TabsTrigger value="door" className="flex-1">
                門禁
              </TabsTrigger>
              <TabsTrigger value="studentid" className="flex-1">
                學號
              </TabsTrigger>
            </TabsList>
          </div>
        </Tabs>
        <div className="flex flex-col gap-2">
          <div>
            <h1 className="text-lg font-bold">{user?.name_zh}</h1>
            <h1>{user?.name_en}</h1>
          </div>
          <div className="flex gap-2">
            <div className="text-sm font-thin">科系</div>
            <h2 className="text-sm">{user?.department}</h2>
          </div>
          <div className="flex gap-2">
            <div className="text-sm font-thin">學號</div>
            <h2 className="text-sm">{user?.studentid}</h2>
          </div>
          <div className="flex gap-2">
            <div className="text-sm font-thin">年級</div>
            <h2 className="text-sm">{user?.grade}</h2>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentIDPage;
