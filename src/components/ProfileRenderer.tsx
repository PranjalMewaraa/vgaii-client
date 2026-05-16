// Dispatcher that picks a visual template based on `profile.template`
// (added in src/lib/validators/profile.ts). Each variant lives in
// src/components/profile-templates/.
//
// Why a switch instead of a Record<>: the template renderers are server
// components and dynamic-importing them by string defeats RSC tree-
// shaking. The switch is trivially small and keeps each renderer
// statically reachable.

import type { Profile } from "@/lib/validators/profile";
import type { TemplateProps } from "@/components/profile-templates/shared";
import ClassicTemplate from "@/components/profile-templates/ClassicTemplate";
import PremiumTemplate from "@/components/profile-templates/PremiumTemplate";
import ClinicalTemplate from "@/components/profile-templates/ClinicalTemplate";

type Props = TemplateProps & {
  // Optional override — when the picker on the profile-edit page wants
  // to show a live preview of an unsaved template choice. If omitted we
  // fall back to whatever's persisted on the profile.
  templateOverride?: Profile["template"];
};

export default function ProfileRenderer({
  templateOverride,
  ...rest
}: Props) {
  const template = templateOverride ?? rest.profile.template ?? "classic";

  switch (template) {
    case "premium":
      return <PremiumTemplate {...rest} />;
    case "clinical":
      return <ClinicalTemplate {...rest} />;
    case "classic":
    default:
      return <ClassicTemplate {...rest} />;
  }
}
