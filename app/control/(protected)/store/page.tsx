import { StoreManager } from "@/components/control/store-manager";
import { requireControlAccountAdmin } from "@/lib/control/server-session";
import { listStoreAdminData } from "@/lib/store/admin-service";

export const dynamic="force-dynamic";
export default async function ControlStorePage(){await requireControlAccountAdmin();const data=await listStoreAdminData();return <StoreManager initialData={data}/>;}
