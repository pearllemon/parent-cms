import Layout from "@/components/site/Layout";

const Privacy = () => (
  <Layout>
    <section className="container py-16 md:py-20 max-w-3xl prose prose-neutral">
      <h1 className="font-display text-4xl md:text-5xl">Privacy Policy</h1>
      <p className="text-muted-foreground">Last updated: April 2026</p>
      <p>
        We respect your privacy. This page outlines how we collect and handle the information you provide via
        forms and on-site interactions on deepakshukla.com.
      </p>
      <h2 className="font-display text-2xl mt-8">What we collect</h2>
      <p>Name, email, phone (optional), and any message you send through our forms. We also collect basic page-view analytics.</p>
      <h2 className="font-display text-2xl mt-8">How we use it</h2>
      <p>To respond to enquiries, to operate and improve the site, and to keep you in the loop with relevant updates if you opt in.</p>
      <h2 className="font-display text-2xl mt-8">Your rights</h2>
      <p>You may request access, correction, or deletion of your data at any time by emailing info@pearllemongroup.com.</p>
    </section>
  </Layout>
);

export default Privacy;
