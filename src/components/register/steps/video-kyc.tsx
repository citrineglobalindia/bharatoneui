import { useState } from "react";
import { Video, MapPin } from "lucide-react";
import { Notice, StepHeader } from "../field";
import { Button } from "@/components/ui/button";

export function VideoKycStep() {
  const [agree, setAgree] = useState(false);
  return (
    <div className="space-y-6">
      <StepHeader
        icon={<Video className="h-5 w-5" />}
        title="Video KYC – Self Declaration"
        description="Read the declaration aloud while recording a short verification video."
      />
      <div className="rounded-xl border border-border bg-background/40 p-5">
        <h3 className="text-sm font-bold text-foreground">🛡 Self Declaration (Read aloud during recording)</h3>
        <div className="mt-3 max-h-48 overflow-auto rounded-md border border-border bg-card p-3 text-sm leading-relaxed text-muted-foreground space-y-2">
          <p className="font-semibold text-foreground">ಸ್ವಯಂ ಘೋಷಣೆ (Short Video Script)</p>
          <p>
            ನಾನು, [Name], ಈ ವೀಡಿಯೊದಲ್ಲಿ ಕಾಣಿಸುತ್ತಿರುವ ವ್ಯಕ್ತಿ ನಾನಾಗಿದ್ದು, ನೋಂದಣಿ ಸಮಯದಲ್ಲಿ ನೀಡಿದ ಎಲ್ಲಾ ಮಾಹಿತಿಯೂ ಸತ್ಯ ಮತ್ತು ಸರಿಯಾಗಿದೆ ಎಂದು ಘೋಷಿಸುತ್ತೇನೆ.
          </p>
          <p>ನಾನು ಸ್ವಯಂ ಪ್ರೇರಿತವಾಗಿ BharatOne Retailer ಆಗಿ ನೋಂದಣಿ ಮಾಡುತ್ತಿದ್ದೇನೆ.</p>
          <p>ಈ ವೀಡಿಯೊವನ್ನು KYC ಪರಿಶೀಲನೆಗಾಗಿ ದಾಖಲಿಸಲು ಮತ್ತು ಬಳಸಲು ನನ್ನ ಸಂಪೂರ್ಣ ಒಪ್ಪಿಗೆ ಇದೆ.</p>
          <p>I confirm that the Aadhaar / PAN documents shown in this video belong to me.</p>
          <p>I agree to abide by the terms and conditions of BharatOne.</p>
        </div>
      </div>

      <Notice tone="warn" title="⚠ Instructions:">
        <ul className="list-disc pl-5 space-y-1">
          <li>Record minimum <b>15 seconds</b> of video</li>
          <li>Read the declaration clearly on camera</li>
          <li>Show your <b>Aadhaar or PAN card</b> in hand</li>
          <li>Face must be clearly visible throughout</li>
          <li>Gallery upload is <b>not allowed</b></li>
        </ul>
      </Notice>

      <label className="flex items-start gap-3 rounded-lg border border-border bg-background/40 px-4 py-3 cursor-pointer">
        <input
          type="radio"
          checked={agree}
          onChange={() => setAgree(true)}
          className="mt-0.5 h-4 w-4 accent-[oklch(0.68_0.18_45)]"
        />
        <span className="text-sm text-muted-foreground">
          I agree to read the above declaration clearly on video and show my identity document (Aadhaar/PAN) during recording.
        </span>
      </label>

      <div className="flex items-center gap-2 text-sm font-medium text-primary">
        <MapPin className="h-4 w-4" /> GPS: 12.9379, 77.4769
      </div>

      <div className="flex justify-center">
        <Button disabled={!agree} className="bg-primary/70 hover:bg-primary disabled:opacity-60">
          <Video className="h-4 w-4" /> Start Recording
        </Button>
      </div>

      <div className="flex flex-col items-center gap-2 rounded-xl border border-border bg-background/40 p-8">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent text-primary">
          <Video className="h-7 w-7" />
        </div>
        <p className="text-sm text-muted-foreground">
          {agree ? "Click 'Start Recording' to begin" : "Accept declaration & start recording"}
        </p>
      </div>
    </div>
  );
}