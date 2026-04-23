import Layout from "@/components/site/Layout";

const Terms = () => (
  <Layout>
    <section className="container py-16 md:py-20 max-w-3xl prose prose-neutral">
      <h1 className="font-display text-4xl md:text-5xl">Terms of Service</h1>
      <p className="text-muted-foreground">Last updated: April 2026</p>
      <p>By using deepakshukla.com you agree to the following terms.</p>
      <h2 className="font-display text-2xl mt-8">Use of content</h2>
      <p>Content is provided for general information. You may not republish without permission.</p>
      <h2 className="font-display text-2xl mt-8">Bookings & engagements</h2>
      <p>Engagements with Deepak or his team are subject to a separate written agreement.</p>
      <h2 className="font-display text-2xl mt-8">Liability</h2>
      <p>The site is provided “as is” without warranties of any kind to the fullest extent permitted by law.</p>
    </section>
  </Layout>
);

export default Terms;
