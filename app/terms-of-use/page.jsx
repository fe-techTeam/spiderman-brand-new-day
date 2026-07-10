// Terms of Use — shows a permanent skeleton until the final legal copy
// lands. Drop the real content in as <LegalSection>/<LegalText>/<LegalList>
// blocks in place of <LegalSkeleton />.
import LegalPage, { LegalSkeleton } from "@/components/main/LegalPage";

export const metadata = {
  title: "Terms of Use",
  description: "The terms and conditions for using Spider-Man: Brand New Day.",
};

export default function TermsOfUsePage() {
  return (
    <LegalPage title="Terms of Use">
      <LegalSkeleton />
    </LegalPage>
  );
}
