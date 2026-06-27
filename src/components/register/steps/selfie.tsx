import { useEffect, useRef, useState } from "react";
import { Camera, X, CheckCircle2, AlertTriangle } from "lucide-react";
import { StepHeader } from "../field";
import { Button } from "@/components/ui/button";
import { useRegistration, dataUrlToFile } from "../registration-context";

export function SelfieStep() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [active, setActive] = useState(false);
  const [shot, setShot] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { setFile } = useRegistration();

  const stop = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  const open = async () => {
    setError(null);
    setShot(null);
    setFile("selfie", undefined);
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
      streamRef.current = s;
      setActive(true);
    } catch (e) {
      console.error(e);
      setError("Camera access denied or unavailable. Please allow camera access and try again.");
    }
  };

  // attach the stream once the live <video> element is actually mounted
  useEffect(() => {
    if (active && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => {});
    }
  }, [active]);

  useEffect(() => () => stop(), []);

  const capture = () => {
    const v = videoRef.current;
    if (!v || !v.videoWidth || !v.videoHeight) {
      setError("Camera is still loading — wait a second and tap Capture again.");
      return;
    }
    const c = document.createElement("canvas");
    c.width = v.videoWidth;
    c.height = v.videoHeight;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(v, 0, 0, c.width, c.height);
    const dataUrl = c.toDataURL("image/jpeg", 0.92);
    setShot(dataUrl);
    setFile("selfie", dataUrlToFile(dataUrl, "selfie.jpg"));
    setActive(false);
    stop();
  };

  const cancel = () => {
    setActive(false);
    stop();
  };

  return (
    <div className="space-y-6">
      <StepHeader
        icon={<Camera className="h-5 w-5" />}
        title="Live Selfie Verification"
        description="Take a clear selfie using your camera. Gallery uploads are not allowed."
      />
      <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <span>Note: Please click the selfie without wearing spectacles (glasses).</span>
      </div>
      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> <span>{error}</span>
        </div>
      )}
      <div className="rounded-xl border-2 border-dashed border-border bg-background/40 p-6">
        {shot ? (
          <div className="flex flex-col items-center gap-4">
            <img src={shot} alt="selfie preview" className="max-h-72 rounded-lg border border-border" />
            <div className="flex items-center gap-2 text-sm font-medium text-[oklch(0.45_0.12_150)]">
              <CheckCircle2 className="h-4 w-4" /> Selfie captured
            </div>
            <Button variant="outline" onClick={open}>
              <Camera className="h-4 w-4" /> Retake
            </Button>
          </div>
        ) : active ? (
          <div className="flex flex-col items-center gap-4">
            <video ref={videoRef} className="max-h-72 rounded-lg border border-border bg-black" playsInline muted autoPlay />
            <div className="flex gap-2">
              <Button onClick={capture} className="bg-primary hover:bg-primary/90">
                <Camera className="h-4 w-4" /> Capture
              </Button>
              <Button variant="outline" onClick={cancel}>
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
