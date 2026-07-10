// Privacy Policy — shows a permanent skeleton until the final legal copy
// lands. Drop the real content in as <LegalSection>/<LegalText>/<LegalList>
// blocks in place of <LegalSkeleton />.
import LegalPage, { LegalSkeleton } from "@/components/main/LegalPage";

export const metadata = {
  title: "Privacy Policy",
  description: "How Spider-Man: Brand New Day collects, uses, and protects your information.",
};

export default function PrivacyPolicyPage() {
  return (
    <LegalPage title="Privacy Policy">
      <LegalSkeleton />
    </LegalPage>
  );
}
