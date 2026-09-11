"use client";
import { Heart } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
export function TopicLikeButton({ topicId, initialLiked, likes, enabled }: { topicId:number; initialLiked:boolean; likes:number; enabled:boolean }) { const router=useRouter(); const [liked,setLiked]=useState(initialLiked); const [busy,setBusy]=useState(false); async function toggle(){if(!enabled)return;setBusy(true);try{const response=await fetch(`/api/forum/topics/${topicId}/like`,{method:"POST"});const body=await response.json();if(!response.ok)throw new Error(body.error);setLiked(body.liked);router.refresh();}finally{setBusy(false);}} return <button type="button" aria-pressed={liked} disabled={!enabled||busy} onClick={toggle} className={`server-button px-5 py-3 focus-ring ${liked?"":"server-button-dark"}`}><Heart className={`h-4 w-4 ${liked?"fill-current":""}`} />{liked?"Đã thích":"Thích"} · {likes}</button>; }

