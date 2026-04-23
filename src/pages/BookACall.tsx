import Layout from "@/components/site/Layout";

const BookACall = () => (
  <Layout>
    <section className="bg-gradient-hero">
      <div className="container py-20 md:py-24 max-w-4xl">
        <span className="text-xs uppercase tracking-[0.3em] text-primary font-semibold">Book a call</span>
        <h1 className="font-display text-5xl md:text-6xl mt-3 leading-tight text-balance">
          Grab 30 minutes on my <span className="text-primary">calendar.</span>
        </h1>
        <p className="text-muted-foreground mt-5 max-w-2xl text-lg">
          Pick a time that works for you. We’ll talk about where you are, where you’re going, and how my team
          can help close the gap.
        </p>
      </div>
    </section>

    <section className="bg-background">
      <div className="container py-12 max-w-5xl">
        <div className="rounded-3xl border-4 border-primary/20 bg-mint p-2 shadow-card overflow-hidden">
          <iframe
            id="ycbmiframedeepakshukla"
            title="Book a call with Deepak Shukla"
            src="https://deepakshukla.youcanbook.me/?noframe=true&skipHeaderFooter=true"
            className="w-full h-[820px] rounded-2xl bg-background"
            frameBorder={0}
          />
        </div>
        <p className="text-center text-sm text-muted-foreground mt-6">
          Trouble loading? <a className="text-primary hover:underline" href="https://deepakshukla.youcanbook.me/" target="_blank" rel="noreferrer">Open the booking page</a>.
        </p>
      </div>
    </section>
  </Layout>
);

export default BookACall;
