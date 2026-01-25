import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function HeroSection() {
  return (
    <section className="p-4 relative min-h-[60vh] flex items-center justify-center overflow-hidden border-b border-b-border-dark">
      {/* Looping background video */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover"
      >
        <source src="/hero-bg.mp4" type="video/mp4" />
      </video>
      {/* Primary color tint overlay - full recolor */}
      <div className="absolute inset-0 bg-primary mix-blend-color" />
      {/* Dark overlay for text readability */}
      <div className="absolute inset-0 bg-black/30" />
      {/* Content */}
      <div className="relative z-10 text-center px-4 max-w-4xl mx-auto text-secondary">
        <h1 className="font-bold text-4xl md:text-5xl lg:text-6xl mb-6 sm:mb-12">
          [IsThatSlop.com]
        </h1>
        <h2 className="text-2xl md:text-3xl lg:text-4xl font-serif  mb-6 leading-tight tracking-tight">
          <span className="block font-semibold">Track AI slop you&apos;ve seen.</span>
          <span className="block">Prevent seeing more of it.</span>
          <span className="block">
            Tell the world what&apos;s{" "}
            <span className="italic font-semibold">human.</span>
          </span>
        </h2>

        <div className="flex gap-2 max-w-md mx-auto mt-8">
          <Input
            placeholder="Search sources..."
            className="flex-1 text-foreground"
          />
          <Button variant="default">Search</Button>
        </div>

        <p className="text-sm mt-6 text-secondary text-shadow-xs">
          The community database for human-made content.
        </p>
        <p className="text-sm mt-1 text-secondary text-shadow-xs">Soon available as a browser extension.</p>
      </div>
    </section>
  );
}
