import { Film, Bot, Globe2 } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface VerificationAccordionProps {
  /** AI confidence percentage (0-100). Defaults to a stable value. */
  aiConfidence?: number;
  className?: string;
}

export default function VerificationAccordion({
  aiConfidence = 94,
  className = "",
}: VerificationAccordionProps) {
  return (
    <Accordion
      type="single"
      collapsible
      className={`w-full ${className}`}
    >
      <AccordionItem value="verified" className="border-none">
        <AccordionTrigger
          className="py-2 hover:no-underline justify-start gap-2 [&>svg]:text-amber [&>svg]:ml-1"
        >
          <span
            className="text-muted-foreground"
            style={{ fontSize: "13px", fontWeight: 500 }}
          >
            How we verified this location
          </span>
        </AccordionTrigger>
        <AccordionContent>
          <div className="flex flex-col md:flex-row gap-3 pt-2">
            {/* TMDB */}
            <div className="glass rounded-full md:rounded-xl px-4 py-3 flex items-center gap-3 flex-1 border border-teal/30">
              <span
                className="w-8 h-8 rounded-full bg-teal/15 text-teal flex items-center justify-center shrink-0"
                aria-hidden
              >
                <Film className="w-4 h-4" />
              </span>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                  <span aria-hidden>🎬</span> TMDB
                </div>
                <div className="text-[11px] text-muted-foreground leading-tight">
                  Cross-referenced with The Movie Database
                </div>
              </div>
            </div>

            {/* AI Analysis */}
            <div className="glass rounded-full md:rounded-xl px-4 py-3 flex items-center gap-3 flex-1 border border-amber/30">
              <span
                className="w-8 h-8 rounded-full bg-amber/15 text-amber flex items-center justify-center shrink-0"
                aria-hidden
              >
                <Bot className="w-4 h-4" />
              </span>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                  <span aria-hidden>🤖</span> AI Analysis
                </div>
                <div className="text-[11px] text-muted-foreground leading-tight">
                  Verified by Gemini AI with{" "}
                  <span
                    className="text-amber"
                    style={{
                      fontFamily:
                        "'JetBrains Mono', ui-monospace, SFMono-Regular, monospace",
                      fontSize: "11px",
                    }}
                  >
                    {aiConfidence}%
                  </span>{" "}
                  confidence
                </div>
              </div>
            </div>

            {/* Geographic Validation */}
            <div className="glass rounded-full md:rounded-xl px-4 py-3 flex items-center gap-3 flex-1 border border-emerald-500/30">
              <span
                className="w-8 h-8 rounded-full bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0"
                aria-hidden
              >
                <Globe2 className="w-4 h-4" />
              </span>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                  <span aria-hidden>🌍</span> Geographic Validation
                </div>
                <div className="text-[11px] text-muted-foreground leading-tight">
                  GPS coordinates confirmed
                </div>
              </div>
            </div>
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
