import { ModuleMarketing, MODULE_PAGES } from "@/components/site/module-marketing";

export default function Page() {
  return (
    <ModuleMarketing
      moduleKey="kev-exposure-review"
      {...MODULE_PAGES["kev-exposure-review"]}
    />
  );
}
