import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { QRCodeSVG } from "qrcode.react";
import { Skeleton } from "@courseweb/ui";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@courseweb/ui";
import { AISNotLoggedIn } from "@/components/Pages/AISNotLoggedIn";
import { useHeadlessAIS } from "@/hooks/useHeadlessAIS";
import {
  fetchOSACode,
  fetchOSAToken,
  fetchDoorQR,
} from "@/lib/headless-ais-api";

const StudentIDPage = () => {
  const [tab, setTab] = useState("door");
  const { ais, getACIXSTORE, user } = useHeadlessAIS();

  const { data: refresh, isLoading: refreshLoading } = useQuery({
    queryKey: ["osa_refreshtoken", user?.studentid],
    queryFn: async () => {
      const ACIXSTORE = await getACIXSTORE();
      return fetchOSACode(ACIXSTORE) as Promise<{
        user_id: string;
        refreshToken: string;
      }>;
    },
    enabled: ais.enabled,
    staleTime: 86400000,
    retry: false,
  });

  const { data: token, isLoading: tokenLoading } = useQuery({
    queryKey: ["osa_accesstoken", refresh?.user_id],
    queryFn: async () => {
      if (!refresh) throw new Error("Refresh token not found");
      const access = (await fetchOSAToken(
        refresh.user_id,
        refresh.refreshToken,
      )) as {
        authToken: string;
        deviceId: string;
        session_id: string;
      };
      return { ...access, user_id: refresh.user_id };
    },
    refetchInterval: 3600000,
    enabled: !!refresh,
    retry: false,
  });

  const { data: qrString, isLoading: qrLoading } = useQuery({
    queryKey: ["door_qr", token?.user_id],
    queryFn: async () => {
      if (!token) throw new Error("Token not found");
      return fetchDoorQR(
        token.authToken,
        token.deviceId,
        token.session_id,
      ) as Promise<string>;
    },
    enabled: !!token && tab === "door",
    refetchInterval: 10000,
    retry: false,
  });

  if (!ais.enabled) return <AISNotLoggedIn />;

  const isLoadingStuff = refreshLoading || tokenLoading || qrLoading;

  return (
    <div className="flex flex-col px-4">
      <div className="flex flex-col gap-2">
        <div>
          <h1 className="text-xl font-bold">國立清華大學</h1>
        </div>
        <Tabs defaultValue="door" value={tab} onValueChange={setTab}>
          <div className="flex flex-col gap-2">
            <TabsContent value="door">
              <div className="flex flex-col items-center">
                {isLoadingStuff || !qrString ? (
                  <Skeleton className="h-60 w-60" />
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
                  <QRCodeSVG className="h-40 w-40" value={user.studentid} />
                  <p className="text-lg font-mono font-semibold">
                    {user.studentid}
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-4">
                  <Skeleton className="h-40 w-40" />
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
