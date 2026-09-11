import { redirect } from "next/navigation";

export default function LegacyEditWikiArticlePage({ params }: { params: { id: string } }) {
  redirect(`/control/wiki/${params.id}`);
}
