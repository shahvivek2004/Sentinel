import Navbar from "../components/landing/Navbar";
import Hero from "../components/landing/Hero";
import UptimeBar from "../components/landing/UptimeBar";
import Features from "../components/landing/Features";
import Metrics from "../components/landing/Metrics";
import Integrations from "../components/landing/Integrations";
import Pricing from "../components/landing/Pricing";
import CTA from "../components/landing/CTA";
import Footer from "../components/landing/Footer";

export default function Home() {
  return (
    <main className="min-h-screen bg-[#080C10] text-white overflow-x-hidden">
      <Navbar />
      <Hero />
      <UptimeBar />
      <Features />
      <Metrics />
      <Integrations />
      <Pricing />
      <CTA />
      <Footer />
    </main>
  );
}
