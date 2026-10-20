import { redirect } from "next/navigation";

/** Rota antiga do mural: o mural vive agora na página inicial. */
export default async function CanhoesFeedPage() {
  redirect("/canhoes");
}
