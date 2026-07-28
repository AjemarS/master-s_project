import { redirect } from "next/navigation";
import {getLocale} from "next-intl/server";

export default function RootPage() {
  const currentLocale = getLocale();

  redirect(`/${currentLocale}`);
}
