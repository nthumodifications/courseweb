import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@courseweb/ui";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@courseweb/ui";
import { AISNotLoggedIn } from "@/components/Pages/AISNotLoggedIn";
import { useHeadlessAIS } from "@/hooks/useHeadlessAIS";
import {
  fetchOSACode,
  fetchOSAToken,
  fetchParcels,
} from "@/lib/headless-ais-api";

type Parcel = {
  barcode: string;
  name: string;
  statusText: string;
  takeTime: string;
  studentNumber: string;
  logistic: string;
};

const ParcelPage = () => {
  const [tab, setTab] = useState("pending");
  const { ais, getACIXSTORE, user } = useHeadlessAIS();

  const { data: refresh } = useQuery({
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

  const { data: token } = useQuery({
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

  const { data: parcels = [] } = useQuery({
    queryKey: ["parcels", token?.user_id],
    queryFn: async () => {
      if (!token) throw new Error("Token not found");
      return fetchParcels(
        token.authToken,
        token.deviceId,
        token.session_id,
      ) as Promise<Parcel[]>;
    },
    enabled: !!token,
    refetchInterval: 300000,
    retry: false,
  });

  if (!ais.enabled) return <AISNotLoggedIn />;

  const pendingParcels = parcels.filter((p) => p.statusText === "pending");
  const archiveParcels = parcels.filter((p) => p.statusText === "已取件");

  return (
    <div className="flex flex-col px-4">
      <Tabs defaultValue="pending" value={tab} onValueChange={setTab}>
        <TabsList className="w-full justify-evenly mb-4">
          <TabsTrigger className="flex-1" value="pending">
            Pending
          </TabsTrigger>
          <TabsTrigger className="flex-1" value="archive">
            Archive
          </TabsTrigger>
        </TabsList>
        <TabsContent value="pending">
          {pendingParcels.map((parcel) => (
            <div
              className="flex flex-col bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 mb-4"
              key={parcel.barcode}
            >
              <div className="flex flex-row gap-1">
                <Badge className="rounded-md" variant="secondary">
                  {parcel.statusText}
                </Badge>
              </div>
              <span className="text-lg font-semibold">{parcel.name}</span>
              <span className="text-sm text-gray-500">
                {parcel.studentNumber}
              </span>
              <span className="text-sm text-gray-500">
                {parcel.logistic} {parcel.barcode}
              </span>
            </div>
          ))}
        </TabsContent>
        <TabsContent value="archive">
          {archiveParcels.map((parcel) => (
            <div
              className="flex flex-col bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 mb-4"
              key={parcel.barcode}
            >
              <div className="flex flex-row gap-1">
                <Badge className="rounded-md" variant="secondary">
                  {parcel.statusText}
                </Badge>
                <span className="text-sm text-gray-500">{parcel.takeTime}</span>
              </div>
              <span className="text-lg font-semibold">{parcel.name}</span>
              <span className="text-sm text-gray-500">
                {parcel.studentNumber}
              </span>
              <span className="text-sm text-gray-500">
                {parcel.logistic} {parcel.barcode}
              </span>
            </div>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ParcelPage;
