import { notFound } from "next/navigation";
import LoginClient from "./LoginClient";

export const dynamic = "force-dynamic";

export default function Page({
  searchParams,
}: {
  searchParams?: { key?: string };
}) {
  const STAFF_LINK_KEY = process.env.STAFF_LINK_KEY || "";
  if (!STAFF_LINK_KEY) return notFound();

  const key = (searchParams?.key || "").trim();
  if (!key || key !== STAFF_LINK_KEY) return notFound();

  return <LoginClient />;
}
