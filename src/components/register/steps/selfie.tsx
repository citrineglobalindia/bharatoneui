import { useEffect, useRef, useState } from "react";
import { Camera, X, CheckCircle2 } from "lucide-react";
import { StepHeader } from "../field";
import { Button } from "@/components/ui/button";
import { useRegistration, dataUrlToFile } from "../registration-context";

export function SelfieStep() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [active, setActive] = useState(false);
  const [shot, setShot] = useState<string | null>(null);
  const { setFile } = useRegistration();

  const open = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false,
      });
      streamRef.current = s;
      if (videoRef.current) {
        videoRef.current.srcObject = s;
        await videoRef.current.play();
      }
      setActive(true);
    } catch (e) {
      console.error(e);
      alert("Camera access denied or not available.");
    }
  };

  const close = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setActive(false);
  };

  const capture = () => {
    if (!videoRef.current) return;
    const v = videoRef.current;
    const c = document.createElement("canvas");
    c.width = v.videoWidth;
    c.height = v.videoHeight;
    c.getContext("2d")?.drawImage(v, 0, 0);
    const dataUrl = c.toDataURL("image/jpeg", 0.9);
    setShot(dataUrl);
    setFile("selfie", dataUrlToFile(dataUrl, "selfie.jpg"));
    close();
  };

  useEffect(() => () => close(), []);

  return (
    <div className="space-y-6">
      <StepHeader
        icon={<Camera className="h-5 w-5" />}
        title="Live Selfie Verification"
        description="Take a clear selfie using your camera. Gallery uploads are not allowed."
      />
      <div className="rounded-xl border-2 border-dashed border-border bg-background/40 p-6">
        {shot ? (
          <div className="flex flex-col items-center gap-4">
            <img src={shot} alt="selfie preview" className="max-h-72 rounded-lg border border-border" />
            <div className="flex items-center gap-2 text-sm font-medium text-[oklch(0.45_0.12_150)]">
              <CheckCircle2 className="h-4 w-4" /> Selfie captured
            </div>
            <Button variant="outline" onClick={() => { setShot(null); setFile("selfie", undefined); open(); }}>
              <Camera className="h-4 w-4" /> Retake
            </Button>
          </div>
        ) : active ? (
          <div className="flex flex-col items-center gap-4">
            <video ref={videoRef} className="max-h-72 rounded-lg border border-border" playsInline muted />
            <div className="flex gap-2">
              <Button onClick={capture} className="bg-primary hover:bg-primary/90">
                <Camera className="h-4 w-4" /> Capture
              </Button>
              <Button variant="outline" onClick={close}>
                <X className="h-4 w-4" /> Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 py-8">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent text-primary">
              <Camera className="h-7 w-7" />
            </div>
            <p className="text-sm text-muted-foreground">Click to open camera</p>
            <Button onClick={open} className="bg-primary hover:bg-primary/90">
              <Camera className="h-4 w-4" /> Open Camera
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
