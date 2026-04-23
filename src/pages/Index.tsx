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

const Index = () => {
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
