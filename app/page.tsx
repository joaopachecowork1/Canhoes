import { redirect } from "next/navigation";

/** A raiz do site reencaminha para a app. */
export default function HomePage() {
  redirect("/canhoes");
}
