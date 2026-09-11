type SectionHeadingProps = {
  eyebrow: string;
  title: string;
  description: string;
};

export function SectionHeading({ eyebrow, title, description }: SectionHeadingProps) {
  return (
    <Reveal className="max-w-2xl">
      <p className="minecraft-title text-xs text-primary">{eyebrow}</p>
      <h2 className="section-title mt-3 minecraft-display text-[2.7rem] leading-none tracking-wide text-balance sm:text-[3.3rem]">{title}</h2>
      <p className="mt-3 text-base leading-7 text-muted-foreground">{description}</p>
    </Reveal>
  );
}
import { Reveal } from "@/components/motion/reveal";
