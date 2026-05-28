import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Video, AlertTriangle, MapPin, Clock, Upload } from "lucide-react";
import { RetailerShell } from "@/components/retailer/retailer-shell";

export const Route = createFileRoute("/video-kyc")({
  head: () => ({
    meta: [
      { title: "Video KYC Verification — BharatOne" },
      { name: "description", content: "Complete your Video KYC verification." },
    ],
  }),
  component: VideoKycPage,
});

const DECLARATION = `ಈ ವೀಡಿಯೊವನ್ನು KYC ಪರಿಶೀಲನೆಗಾಗಿ ದಾಖಲಿಸಲು ಮತ್ತು ಬಳಸಲು ನನ್ನ ಸಂಪೂರ್ಣ ಒಪ್ಪಿಗೆ ಇದೆ.

ಈ ವೀಡಿಯೊದಲ್ಲಿ ತೋರಿಸಿರುವ ಆಧಾರ್ / ಪ್ಯಾನ್ ದಾಖಲೆಗಳು ನನ್ನದೇ ಎಂದು ದೃಢಪಡಿಸುತ್ತೇನೆ.

ನಾನು BharatOne ನಿಯಮಗಳು ಮತ್ತು ಷರತ್ತುಗಳನ್ನು ಪಾಲಿಸುತ್ತೇನೆ.

---

Self Declaration (English)

I, [Name], hereby declare that I am the person appearing in this video, and all the information provided during registration is true and correct to the best of my knowledge.

I voluntarily consent to BharatOne recording, storing, and using this video for KYC verification, account activation, and regulatory compliance purposes.

The Aadhaar / PAN document shown in this video belongs to me. I agree to BharatOne's Terms & Conditions and Privacy Policy.`;

function VideoKycPage() {
  const [agreed, setAgreed] = useState(false);
  return (
    <RetailerShell>
      <div className="max-w-4xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="font-display text-2xl font-extrabold">Video KYC Verification</h1>
            <p className="text-sm text-muted-foreground">Complete your identity verification via live video recording</p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 text-amber-800 px-3 py-1 text-xs font-semibold">
            <Clock className="h-3.5 w-3.5" /> Pending
          </span>
        </div>

        {/* Declaration card */}
        <section className="rounded-2xl border border-border bg-card p-5 shadow-soft space-y-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-saffron/10 text-saffron flex items-center justify-center">
              <Video className="h-4 w-4" />
            </div>
            <h2 className="font-display text-lg font-bold">Video KYC – Self Declaration</h2>
          </div>

          <div className="rounded-lg border border-border bg-muted/30 p-4 h-56 overflow-y-auto text-sm leading-relaxed whitespace-pre-line text-foreground/90">
            {DECLARATION}
          </div>

          {/* Instructions */}
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-amber-700" />
              <p className="font-bold text-sm text-amber-900">Instructions:</p>
            </div>
            <ul className="space-y-1 text-sm text-amber-900/90 list-disc pl-5">
              <li>Record minimum <strong>15 seconds</strong> of video</li>
              <li>Read the declaration clearly on camera</li>
              <li>Show your <strong>Aadhaar</strong> or <strong>PAN card</strong> in hand</li>
              <li>Face must be clearly visible throughout</li>
              <li>Gallery upload is <strong>not allowed</strong></li>
            </ul>
          </div>

          {/* Agreement */}
          <label className="flex items-start gap-3 rounded-lg border border-border bg-background p-3 cursor-pointer hover:bg-muted/40">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-india-green"
            />
            <span className="text-sm text-foreground/90">
              I agree to read the above declaration clearly on video and show my identity document (Aadhaar/PAN) during recording.
            </span>
          </label>

          {/* GPS */}
          <div className="flex items-center gap-1.5 text-saffron text-sm font-semibold">
            <MapPin className="h-4 w-4" /> GPS unavailable
          </div>

          {/* CTA */}
          <div className="flex justify-center pt-1">
            <button
              disabled={!agreed}
              className="inline-flex items-center gap-2 rounded-lg bg-saffron-gradient text-white px-6 py-3 text-sm font-bold shadow-elev disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] transition"
            >
              <Video className="h-4 w-4" /> Start Recording
            </button>
          </div>
        </section>

        {/* Recorded video panel placeholder */}
        <section className="rounded-2xl border border-dashed border-border bg-card p-5">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-muted text-muted-foreground flex items-center justify-center">
                <Upload className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-bold">Your recording</p>
                <p className="text-xs text-muted-foreground">No video recorded yet — start recording to continue.</p>
              </div>
            </div>
            <button
              disabled
              className="rounded-lg bg-india-green text-white px-4 py-2 text-sm font-semibold disabled:opacity-50"
            >
              Submit for Verification
            </button>
          </div>
        </section>
      </div>
    </RetailerShell>
  );
}