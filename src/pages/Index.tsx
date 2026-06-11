import Layout from "@/components/site/Layout";
import Hero from "@/components/site/Hero";
import TeamAndPress from "@/components/site/TeamAndPress";
import YouTubeSection from "@/components/site/YouTubeSection";
import TedxBento from "@/components/site/TedxBento";
import ContactBlock from "@/components/site/ContactBlock";
import SplitMediaCTA from "@/components/site/SplitMediaCTA";
import Testimonials from "@/components/site/Testimonials";
import ProServices from "@/components/site/ProServices";
import StoriesOfMyLife from "@/components/site/StoriesOfMyLife";
import Adventure from "@/components/site/Adventure";
import EntrepreneurshipWealth from "@/components/site/EntrepreneurshipWealth";
import LearnMoreCTA from "@/components/site/LearnMoreCTA";
import LatestBlogs from "@/components/site/LatestBlogs";

import { useSEO } from "@/lib/seo";

const Index = () => {
  useSEO({
    title: "Deepak Shukla — Investor at The Pearl Lemon Group",
    description:
      "Hire Deepak Shukla — lead investor at Pearl Lemon Group. SEO, growth, sales, communications. 7-figure agency founder, TEDx speaker.",
    canonical: "/",
    type: "website",
    image: "https://deepakshukla.com/wp-content/uploads/2024/08/Heading-4.png",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "Person",
      name: "Deepak Shukla",
      jobTitle: "Lead Investor, Pearl Lemon Group",
      url: typeof window !== "undefined" ? window.location.origin + "/" : "/",
      image: "https://deepakshukla.com/wp-content/uploads/2024/08/Heading-4.png",
      sameAs: [
        "https://www.linkedin.com/in/deepakshukla1/",
        "https://www.youtube.com/@deepakshuklaofficial",
        "https://twitter.com/deepakshukla",
      ],
    },
  });
  return (
    <Layout>
      <Hero />
      <TeamAndPress />
      <YouTubeSection />
      <TedxBento />
      <ContactBlock />
      <SplitMediaCTA />
      <Testimonials />
      <ProServices />
      <StoriesOfMyLife />
      <Adventure />
      <EntrepreneurshipWealth />
      <LearnMoreCTA />
      <LatestBlogs />
    </Layout>
  );
};

export default Index;
