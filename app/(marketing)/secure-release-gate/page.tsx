import { ModuleMarketing, MODULE_PAGES } from "@/components/site/module-marketing";

export default function Page() {
  return (
    <ModuleMarketing
      moduleKey="secure-release-gate"
      {...MODULE_PAGES["secure-release-gate"]}
    />
  );
}
