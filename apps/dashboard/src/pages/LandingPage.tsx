import { useRef } from "react";
import { HeroReveal } from "@/components/HeroReveal";
import { ScreenplayActs } from "@/components/ScreenplayActs";
import { FooterPixelWave } from "@/components/FooterPixelWave";

export function LandingPage() {
  const screenplayRef = useRef<HTMLDivElement>(null);

  const scrollToScreenplay = () => {
    screenplayRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-[#07080B] text-text selection:bg-white selection:text-black flex flex-col">
      {/* ACT I: The Entry & Hero Reveal */}
      <HeroReveal onExploreClick={scrollToScreenplay} />

      {/* ACTS II through VII: The Storytelling Screenplay */}
      <div ref={screenplayRef} id="screenplay" className="scroll-mt-6 flex-1">
        <ScreenplayActs />
      </div>

      {/* FOOTER: Scroll-Driven Pixel Wave */}
      <FooterPixelWave />
    </div>
  );
}
