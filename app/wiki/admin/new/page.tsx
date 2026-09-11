import { redirect } from "next/navigation";

export default function LegacyNewWikiArticlePage() {
  redirect("/control/wiki/new");
}
