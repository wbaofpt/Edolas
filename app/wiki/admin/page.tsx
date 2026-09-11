import { redirect } from "next/navigation";

export default function LegacyWikiAdminPage() {
  redirect("/control/wiki");
}
