export const metadata = {
  title: "Privacy Policy - Socialflow Publisher",
  description: "Privacy Policy for Socialflow Publisher"
};

export default function PrivacyPage() {
  return (
    <main style={{ padding: 24, maxWidth: 720, margin: "0 auto", fontFamily: "system-ui", lineHeight: 1.6 }}>
      <h1>Privacy Policy</h1>
      <p style={{ color: "#666", marginBottom: 24 }}>Last updated: {new Date().toLocaleDateString("en-US")}</p>

      <section style={{ marginBottom: 24 }}>
        <h2>1. Introduction</h2>
        <p>
          Socialflow Publisher ("we", "our", or "the Service") is a content management tool that allows users to
          publish videos to YouTube, Instagram, TikTok, and Facebook from a single dashboard. This Privacy Policy
          explains how we collect, use, store, and protect your information when you use our Service.
        </p>
      </section>

      <section style={{ marginBottom: 24 }}>
        <h2>2. Information We Collect</h2>
        <p>
          <strong>Account Connection Data:</strong> When you connect your social media accounts (YouTube, Instagram,
          TikTok, Facebook) via OAuth, we receive and store access tokens that allow us to publish content on your
          behalf. We also store basic profile information (e.g., display name, account ID) necessary to identify your
          connected accounts.
        </p>
        <p>
          <strong>Content Data:</strong> When you upload a video for publishing, the file is temporarily stored on our
          servers and transmitted to the selected platforms. We do not use your content for any purpose other than
          publishing it to your chosen platforms.
        </p>
        <p>
          <strong>Usage Data:</strong> We may collect usage information such as IP address, browser type, and timestamps
          to maintain and improve the Service.
        </p>
      </section>

      <section style={{ marginBottom: 24 }}>
        <h2>3. How We Use Your Information</h2>
        <p>
          We use the collected information solely to: (a) connect and authenticate your social media accounts, (b)
          publish videos you upload to your selected platforms, (c) display your connected accounts and post status in
          the dashboard, and (d) maintain the security and operation of the Service.
        </p>
      </section>

      <section style={{ marginBottom: 24 }}>
        <h2>4. Data Sharing and Third Parties</h2>
        <p>
          We do not sell, rent, or trade your personal information. Your data is shared only with the platforms you
          explicitly connect (YouTube/Google, Instagram/Meta, TikTok, Facebook/Meta) for the sole purpose of publishing
          content as you direct. Each platform has its own privacy policy governing their use of your data.
        </p>
      </section>

      <section style={{ marginBottom: 24 }}>
        <h2>5. Data Retention</h2>
        <p>
          Access tokens are stored until you disconnect an account or until they expire. When you remove a connected
          account, we delete the associated tokens and profile data. Uploaded videos may be retained temporarily during
          the publishing process and are not stored long-term after publishing completes.
        </p>
      </section>

      <section style={{ marginBottom: 24 }}>
        <h2>6. Data Security</h2>
        <p>
          We implement appropriate technical and organizational measures to protect your personal data against
          unauthorized access, alteration, disclosure, or destruction. Access tokens and credentials are stored securely.
        </p>
      </section>

      <section style={{ marginBottom: 24 }}>
        <h2>7. Your Rights</h2>
        <p>
          You have the right to: (a) access the data we hold about you, (b) request correction of inaccurate data, (c)
          request deletion of your data, and (d) disconnect your accounts at any time to revoke our access. To exercise
          these rights, disconnect your accounts through the dashboard or contact us.
        </p>
      </section>

      <section style={{ marginBottom: 24 }}>
        <h2>8. Children's Privacy</h2>
        <p>
          Our Service is not intended for users under 13 years of age. We do not knowingly collect personal information
          from children under 13.
        </p>
      </section>

      <section style={{ marginBottom: 24 }}>
        <h2>9. Changes to This Policy</h2>
        <p>
          We may update this Privacy Policy from time to time. We will notify users of material changes by posting the
          updated policy on this page with a new "Last updated" date.
        </p>
      </section>

      <section style={{ marginBottom: 24 }}>
        <h2>10. Contact Us</h2>
        <p>
          For questions about this Privacy Policy or your data, please contact us through the project repository or
          developer contact information provided in the application.
        </p>
      </section>

      <p style={{ marginTop: 32 }}>
        <a href="/" style={{ color: "#0066cc" }}>
          ← Back to Home
        </a>
      </p>
    </main>
  );
}
