import LegalPage, { LegalSection, LegalText, LegalList } from "@/components/main/LegalPage";
import { s } from "@/lib/style";

export const metadata = {
  title: "Terms of Use",
  description: "The terms and conditions for using Spidermania.in.",
};

export default function TermsOfUsePage() {
  return (
    <LegalPage title="Terms of Use" effectiveDate="10 July 2026">
      <div style={s("margin: 0 0 clamp(26px, 4vh, 38px);")}>
        <LegalText>
          Welcome to Spidermania.in, an interactive promotional experience operated by Sony Pictures India for <em>Spider-Man: Brand New Day</em>.
        </LegalText>
        <LegalText>By accessing or using this Website, you agree to comply with these Terms of Use.</LegalText>
      </div>

      <LegalSection title="Eligibility">
        <LegalText>You must comply with all applicable laws and meet any minimum age requirements applicable in your jurisdiction.</LegalText>
      </LegalSection>

      <LegalSection title="User Accounts">
        <LegalText>You are responsible for maintaining the confidentiality of your account credentials and all activity under your account.</LegalText>
      </LegalSection>

      <LegalSection title="Community Features">
        <LegalText>The Website includes forums, the MJ Wall, avatars, and other interactive experiences.</LegalText>
        <LegalList
          items={[
            "Do not post unlawful, abusive, defamatory, hateful, or threatening content.",
            "Do not upload malicious software.",
            "Do not spam or impersonate others.",
            "Do not infringe intellectual property or privacy rights.",
            "Do not interfere with Website operations.",
          ]}
        />
      </LegalSection>

      <LegalSection title="User-Generated Content">
        <LegalText>
          You retain ownership of your content. By posting, you grant Sony Pictures India and its affiliates a worldwide, non-exclusive, royalty-free license to use such content for operating, maintaining, and promoting the Website.
        </LegalText>
      </LegalSection>

      <LegalSection title="Content Moderation">
        <LegalText>Sony Pictures India may review, edit, remove, or restrict content or accounts that violate these Terms.</LegalText>
      </LegalSection>

      <LegalSection title="Intellectual Property">
        <LegalText>Spider-Man, Marvel, associated characters, names, logos, artwork, images, and trademarks belong to their respective rights holders.</LegalText>
      </LegalSection>

      <LegalSection title="Spoilers and Community Discussions">
        <LegalText>User discussions may include theories and spoilers. User opinions do not necessarily reflect those of Sony Pictures India.</LegalText>
      </LegalSection>

      <LegalSection title="Disclaimer">
        <LegalText>The Website is provided “as is” and “as available”.</LegalText>
      </LegalSection>

      <LegalSection title="Limitation of Liability">
        <LegalText>
          To the maximum extent permitted by law, Sony Pictures India shall not be liable for indirect or consequential damages arising from use of the Website.
        </LegalText>
      </LegalSection>

      <LegalSection title="Termination">
        <LegalText>Sony Pictures India may suspend or terminate accounts for violations of these Terms.</LegalText>
      </LegalSection>

      <LegalSection title="Governing Law">
        <LegalText>These Terms are governed by the laws of India.</LegalText>
      </LegalSection>

      <LegalSection title="Changes to the Terms">
        <LegalText>These Terms may be updated from time to time. Continued use constitutes acceptance of the revised Terms.</LegalText>
      </LegalSection>

      <LegalSection title="Contact">
        <LegalText>Company: Sony Pictures India</LegalText>
      </LegalSection>
    </LegalPage>
  );
}
