import { getChrome } from "@/lib/server/cms";
import { NavClient } from "./NavClient";

/** Server wrapper: loads the (CMS-editable) menu once and hands it to the interactive nav. */
export async function KonjedNavigation() {
  return <NavClient chrome={await getChrome()} />;
}
