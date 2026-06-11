import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import FeaturesSection from "@/components/FeaturesSection";
import DownloadSection from "@/components/DownloadSection";
import AboutSection from "@/components/AboutSection";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <main className="relative min-h-screen bg-battle-dark">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_top,rgba(244,123,37,0.05),transparent_50%)]" />
      <Header />
      <HeroSection />
      <FeaturesSection />
      <DownloadSection />
      <AboutSection />
      <Footer />
    </main>
  );
}
