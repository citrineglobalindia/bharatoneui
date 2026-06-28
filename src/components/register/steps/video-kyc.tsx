import { useEffect, useRef, useState } from "react";
import { Video, MapPin, Square, RotateCcw, CheckCircle2, AlertTriangle } from "lucide-react";
import { Notice, StepHeader } from "../field";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useRegistration } from "../registration-context";

const MIN_SECONDS = 15;

// Terms & Conditions content in English and Kannada (label, body) per clause.
const TERMS_EN: [string, string][] = [
  ["1. Nature of Services:", "BharatOne offers assistance in accessing government schemes, subsidies, certifications and application services. We are not a government agency; all services are consultancy/support-based and do not guarantee approval."],
  ["2. Eligibility:", "You must be at least 18 years old and legally capable of entering into binding contracts."],
  ["3. Acceptable Use:", "Use the platform only for lawful purposes; do not misrepresent your identity, provide false information, or attempt unauthorized/fraudulent activity."],
  ["4. Payments & Refunds:", "Applicable charges are disclosed before payment. Payments are non-refundable once a service has been initiated."],
  ["5. Intellectual Property:", "All content is the property of BharatOne and protected by law; no copying or distribution without written permission."],
  ["6. Disclaimer & Liability:", "Services are best-effort; we do not guarantee completeness/accuracy of information or results, and are not liable for indirect or consequential damages."],
  ["7. Data & Privacy:", "Your personal data is handled per our Privacy Policy and used only to provide the requested services."],
  ["8. Termination & Changes:", "Access may be suspended for breach; terms may be updated and continued use constitutes acceptance."],
  ["9. Governing Law:", "These terms are governed by the laws of India; disputes are subject to courts in Karnataka, India."],
];
const TERMS_KN: [string, string][] = [
  ["1. ಸೇವೆಗಳ ಸ್ವರೂಪ:", "BharatOne ಸರ್ಕಾರಿ ಯೋಜನೆಗಳು, ಸಬ್ಸಿಡಿಗಳು, ಪ್ರಮಾಣಪತ್ರಗಳು ಮತ್ತು ಅರ್ಜಿ ಸೇವೆಗಳನ್ನು ಪಡೆಯಲು ಸಹಾಯ ನೀಡುತ್ತದೆ. ನಾವು ಸರ್ಕಾರಿ ಸಂಸ್ಥೆಯಲ್ಲ; ಎಲ್ಲಾ ಸೇವೆಗಳು ಸಲಹಾ/ಬೆಂಬಲ ಆಧಾರಿತವಾಗಿದ್ದು ಅನುಮೋದನೆಯ ಖಾತರಿ ನೀಡುವುದಿಲ್ಲ."],
  ["2. ಅರ್ಹತೆ:", "ನೀವು ಕನಿಷ್ಠ 18 ವರ್ಷ ವಯಸ್ಸಿನವರಾಗಿರಬೇಕು ಮತ್ತು ಒಪ್ಪಂದಗಳಿಗೆ ಕಾನೂನುಬದ್ಧವಾಗಿ ಸಮರ್ಥರಾಗಿರಬೇಕು."],
  ["3. ಸ್ವೀಕಾರಾರ್ಹ ಬಳಕೆ:", "ವೇದಿಕೆಯನ್ನು ಕಾನೂನುಬದ್ಧ ಉದ್ದೇಶಗಳಿಗೆ ಮಾತ್ರ ಬಳಸಿ; ನಿಮ್ಮ ಗುರುತನ್ನು ತಪ್ಪಾಗಿ ತೋರಿಸಬೇಡಿ, ಸುಳ್ಳು ಮಾಹಿತಿ ನೀಡಬೇಡಿ ಅಥವಾ ಅನಧಿಕೃತ/ವಂಚನೆಯ ಚಟುವಟಿಕೆ ಮಾಡಬೇಡಿ."],
  ["4. ಪಾವತಿ ಮತ್ತು ಮರುಪಾವತಿ:", "ಅನ್ವಯವಾಗುವ ಶುಲ್ಕಗಳನ್ನು ಪಾವತಿಗೆ ಮುನ್ನ ತಿಳಿಸಲಾಗುತ್ತದೆ. ಸೇವೆ ಆರಂಭವಾದ ನಂತರ ಪಾವತಿಗಳು ಮರುಪಾವತಿಸಲಾಗದು."],
  ["5. ಬೌದ್ಧಿಕ ಆಸ್ತಿ:", "ಎಲ್ಲಾ ವಿಷಯವು BharatOne ನ ಆಸ್ತಿಯಾಗಿದ್ದು ಕಾನೂನಿನಿಂದ ರಕ್ಷಿಸಲ್ಪಟ್ಟಿದೆ; ಲಿಖಿತ ಅನುಮತಿ ಇಲ್ಲದೆ ನಕಲು ಅಥವಾ ವಿತರಣೆ ಮಾಡಬಾರದು."],
  ["6. ಹಕ್ಕು ನಿರಾಕರಣೆ ಮತ್ತು ಹೊಣೆಗಾರಿಕೆ:", "ಸೇವೆಗಳು ಅತ್ಯುತ್ತಮ ಪ್ರಯತ್ನ ಆಧಾರಿತ; ಮಾಹಿತಿ ಅಥವಾ ಫಲಿತಾಂಶಗಳ ಸಂಪೂರ್ಣತೆ/ನಿಖರತೆಯ ಖಾತರಿ ನೀಡುವುದಿಲ್ಲ ಮತ್ತು ಪರೋಕ್ಷ ಅಥವಾ ಪರಿಣಾಮಕಾರಿ ಹಾನಿಗಳಿಗೆ ಹೊಣೆಯಾಗುವುದಿಲ್ಲ."],
  ["7. ಡೇಟಾ ಮತ್ತು ಗೌಪ್ಯತೆ:", "ನಿಮ್ಮ ವೈಯಕ್ತಿಕ ಮಾಹಿತಿಯನ್ನು ನಮ್ಮ ಗೌಪ್ಯತಾ ನೀತಿಯ ಪ್ರಕಾರ ನಿರ್ವಹಿಸಲಾಗುತ್ತದೆ ಮತ್ತು ವಿನಂತಿಸಿದ ಸೇವೆಗಳನ್ನು ಒದಗಿಸಲು ಮಾತ್ರ ಬಳಸಲಾಗುತ್ತದೆ."],
  ["8. ಮುಕ್ತಾಯ ಮತ್ತು ಬದಲಾವಣೆಗಳು:", "ಉಲ್ಲಂಘನೆಗೆ ಪ್ರವೇಶವನ್ನು ಸ್ಥಗಿತಗೊಳಿಸಬಹುದು; ನಿಯಮಗಳನ್ನು ನವೀಕರಿಸಬಹುದು ಮತ್ತು ಮುಂದುವರಿದ ಬಳಕೆ ಸ್ವೀಕಾರವೆಂದು ಪರಿಗಣಿಸಲಾಗುತ್ತದೆ."],
  ["9. ಆಡಳಿತ ಕಾನೂನು:", "ಈ ನಿಯಮಗಳು ಭಾರತದ ಕಾನೂನುಗಳಿಗೆ ಒಳಪಟ್ಟಿವೆ; ವಿವಾದಗಳು ಕರ್ನಾಟಕ, ಭಾರತದ ನ್ಯಾಯಾಲಯಗಳ ವ್ಯಾಪ್ತಿಗೆ ಒಳಪಡುತ್ತವೆ."],
];

export function VideoKycStep() {
  const { data, set, files, setFile } = useRegistration();
  const agree = data.declarationAgreed;
  const setAgree = (v: boolean) => set({ declarationAgreed: v });
  const terms = data.termsAgreed;
  const setTerms = (v: boolean) => set({ termsAgreed: v });
  const fullName = [data.firstName, data.middleName, data.surname].filter(Boolean).join(" ") || "[Your Name]";
  const fullAddress = [data.buildingShopNo, data.streetArea, data.landmark, data.villageName, data.city, data.taluk, data.district, data.state, data.pincode].filter(Boolean).join(", ") || "[Address from your form]";
  const [lang, setLang] = useState<"kn" | "en">("kn");
  const [termsLang, setTermsLang] = useState<"kn" | "en">("en");
  const [consentOpen, setConsentOpen] = useState(false);

  const liveRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const timerRef = useRef<number | null>(null);

  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const hasVideo = !!files.video;

  // Attach the camera stream to the live <video> once it is actually mounted
  // (the element only renders while recording, so binding inside start() hit a null ref).
  useEffect(() => {
    if (recording && liveRef.current && streamRef.current) {
      liveRef.current.srcObject = streamRef.current;
      liveRef.current.muted = true;
      liveRef.current.play().catch(() => {});
    }
  }, [recording]);

  const stopTracks = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };
  const clearTimer = () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  };

  useEffect(() => {
    return () => {
      clearTimer();
      stopTracks();
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const captureGps = () => {
    if (!("geolocation" in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (p) => set({ videoLat: +p.coords.latitude.toFixed(6), videoLng: +p.coords.longitude.toFixed(6) }),
      () => {},
      { enableHighAccuracy: true, timeout: 8000 },
    );
  };

  const start = async () => {
    setError(null);
    if (previewUrl) { URL.revokeObjectURL(previewUrl); setPreviewUrl(null); }
    setFile("video", undefined);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: true,
      });
      streamRef.current = stream;
      captureGps();

      const mime = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
        ? "video/webm;codecs=vp9,opus"
        : MediaRecorder.isTypeSupported("video/webm")
          ? "video/webm"
          : "";
      const rec = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      chunksRef.current = [];
      rec.ondataavailable = (e) => { if (e.data && e.data.size > 0) chunksRef.current.push(e.data); };
      rec.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "video/webm" });
        setPreviewUrl(URL.createObjectURL(blob));
        setFile("video", new File([blob], "video-kyc.webm", { type: "video/webm" }));
        stopTracks();
      };
      recorderRef.current = rec;
      rec.start();
      setRecording(true);
      setSeconds(0);
      timerRef.current = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    } catch (e) {
      console.error(e);
      setError("Camera / microphone access was denied or is unavailable. Please allow access and try again.");
    }
  };

  const stop = () => {
    if (seconds < MIN_SECONDS) {
      setError(`Please record at least ${MIN_SECONDS} seconds before stopping.`);
      return;
    }
    clearTimer();
    recorderRef.current?.stop();
    setRecording(false);
  };

  const retake = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setFile("video", undefined);
    setSeconds(0);
    setError(null);
  };

  const gpsLabel =
    data.videoLat != null && data.videoLng != null
      ? `${data.videoLat}, ${data.videoLng}`
      : "Will be captured when recording starts";

  return (
    <div className="space-y-6">
      <StepHeader
        icon={<Video className="h-5 w-5" />}
        title="Video KYC – Self Declaration"
        description="Read the declaration aloud while recording a short verification video."
      />
      <div className="rounded-xl border border-border bg-background/40 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-bold text-foreground">🛡 Self Declaration (Read aloud during recording)</h3>
          <div className="inline-flex rounded-lg border border-border bg-card p-0.5 text-xs font-semibold">
            <button type="button" onClick={() => setLang("kn")} className={`rounded-md px-3 h-7 transition ${lang === "kn" ? "bg-india-green text-white" : "text-muted-foreground hover:text-foreground"}`}>ಕನ್ನಡ</button>
            <button type="button" onClick={() => setLang("en")} className={`rounded-md px-3 h-7 transition ${lang === "en" ? "bg-india-green text-white" : "text-muted-foreground hover:text-foreground"}`}>English</button>
          </div>
        </div>
        <div className="mt-3 max-h-48 overflow-auto rounded-md border border-border bg-card p-3 text-sm leading-relaxed text-muted-foreground space-y-2">
          {lang === "kn" ? (
            <>
              <p className="font-semibold text-foreground">ಸ್ವಯಂ ಘೋಷಣೆ (ಸಂಕ್ಷಿಪ್ತ ವೀಡಿಯೊ ಸ್ಕ್ರಿಪ್ಟ್)</p>
              <p>ನಾನು, {fullName}, ಈ ವೀಡಿಯೊದಲ್ಲಿ ಕಾಣಿಸುತ್ತಿರುವ ವ್ಯಕ್ತಿ ನಾನಾಗಿದ್ದು, ನೋಂದಣಿ ಸಮಯದಲ್ಲಿ ನೀಡಿದ ಎಲ್ಲಾ ಮಾಹಿತಿಯೂ ಸತ್ಯ ಮತ್ತು ಸರಿಯಾಗಿದೆ ಎಂದು ಘೋಷಿಸುತ್ತೇನೆ.</p>
              <p>ನಾನು ಸ್ವಯಂ ಪ್ರೇರಿತವಾಗಿ BharatOne Retailer ಆಗಿ ನೋಂದಣಿ ಮಾಡುತ್ತಿದ್ದೇನೆ.</p>
              <p>ಈ ವೀಡಿಯೊವನ್ನು KYC ಪರಿಶೀಲನೆಗಾಗಿ ದಾಖಲಿಸಲು ಮತ್ತು ಬಳಸಲು ನನ್ನ ಸಂಪೂರ್ಣ ಒಪ್ಪಿಗೆ ಇದೆ.</p>
              <p>ಈ ವೀಡಿಯೊದಲ್ಲಿ ತೋರಿಸಿರುವ ಆಧಾರ್ / ಪ್ಯಾನ್ ದಾಖಲೆಗಳು ನನಗೆ ಸೇರಿದವು ಎಂದು ನಾನು ಖಚಿತಪಡಿಸುತ್ತೇನೆ.</p>
              <p>ನನ್ನ ನೋಂದಾಯಿತ ವಿಳಾಸ: <span className="font-semibold text-foreground">{fullAddress}</span>.</p>
              <p>BharatOne ನ ನಿಯಮಗಳು ಮತ್ತು ಷರತ್ತುಗಳನ್ನು ಪಾಲಿಸಲು ನಾನು ಒಪ್ಪುತ್ತೇನೆ.</p>
            </>
          ) : (
            <>
              <p className="font-semibold text-foreground">Self Declaration (Short Video Script)</p>
              <p>I, {fullName}, declare that I am the person appearing in this video, and that all the information provided during registration is true and correct.</p>
              <p>I am registering as a BharatOne Retailer of my own free will.</p>
              <p>I give my full consent to record and use this video for KYC verification.</p>
              <p>I confirm that the Aadhaar / PAN documents shown in this video belong to me.</p>
              <p>My registered address is: <span className="font-semibold text-foreground">{fullAddress}</span>.</p>
              <p>I agree to abide by the terms and conditions of BharatOne.</p>
            </>
          )}
        </div>
      </div>

      <Notice tone="warn" title="⚠ Instructions:">
        <ul className="list-disc pl-5 space-y-1">
          <li>Record minimum <b>15 seconds</b> of video</li>
          <li>Read the declaration clearly on camera</li>
          <li>Show your <b>Aadhaar or PAN card</b> in hand</li>
          <li>Face must be clearly visible throughout</li>
          <li><b>Do not wear spectacles / sunglasses</b> during the recording</li>
          <li>Read out your <b>address</b> shown in the declaration</li>
          <li>Gallery upload is <b>not allowed</b></li>
        </ul>
      </Notice>

      {/* Terms & Conditions — mandatory */}
      <div className="rounded-xl border border-border bg-background/40 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-bold text-foreground">📜 Terms &amp; Conditions <span className="text-primary">*</span></h3>
          <div className="inline-flex rounded-lg border border-border bg-card p-0.5 text-xs font-semibold">
            <button type="button" onClick={() => setTermsLang("kn")} className={`rounded-md px-3 h-7 transition ${termsLang === "kn" ? "bg-india-green text-white" : "text-muted-foreground hover:text-foreground"}`}>ಕನ್ನಡ</button>
            <button type="button" onClick={() => setTermsLang("en")} className={`rounded-md px-3 h-7 transition ${termsLang === "en" ? "bg-india-green text-white" : "text-muted-foreground hover:text-foreground"}`}>English</button>
          </div>
        </div>
        <p className="mt-1 text-[11px] text-muted-foreground">{termsLang === "kn" ? "ಕೆಳಗಿನ ಪೂರ್ಣ ನಿಯಮಗಳನ್ನು ಓದಿ. ಮುಂದುವರಿಯಲು ಅವುಗಳನ್ನು ಓದಿ ಒಪ್ಪಿಕೊಳ್ಳಬೇಕು." : "Please read the full terms below. You must read and accept them to continue."}</p>
        <div className="mt-3 max-h-44 overflow-auto rounded-md border border-border bg-card p-3 text-[12px] leading-relaxed text-muted-foreground space-y-2">
          {(termsLang === "kn" ? TERMS_KN : TERMS_EN).map(([label, body], i) => (
            <p key={i}><b className="text-foreground">{label}</b> {body}</p>
          ))}
          <p>{termsLang === "kn" ? "ಪೂರ್ಣ ನಿಯಮಗಳು ಮತ್ತು ಷರತ್ತುಗಳು: " : "Full Terms & Conditions: "}<a href="/terms-and-conditions" target="_blank" rel="noreferrer" className="font-semibold text-india-green hover:underline">{termsLang === "kn" ? "ಇಲ್ಲಿ ಓದಿ" : "read here"}</a>.</p>
        </div>
        <label className="mt-3 flex items-start gap-3 cursor-pointer">
          <input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[oklch(0.55_0.12_150)]" />
          <span className="text-sm text-foreground">I have <b>read and agree</b> to the BharatOne Terms &amp; Conditions. <span className="text-primary">*</span></span>
        </label>
      </div>

      <label className="flex items-start gap-3 rounded-lg border border-border bg-background/40 px-4 py-3 cursor-pointer">
        <input
          type="checkbox"
          checked={agree}
          onChange={(e) => setAgree(e.target.checked)}
          className="mt-0.5 h-4 w-4 accent-[oklch(0.68_0.18_45)]"
        />
        <span className="text-sm text-muted-foreground">
          I agree to read the above declaration clearly on video and show my identity document (Aadhaar/PAN) during recording.
        </span>
      </label>

      <div className="flex items-center gap-2 text-sm font-medium text-primary">
        <MapPin className="h-4 w-4" /> GPS: {gpsLabel}
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> <span>{error}</span>
        </div>
      )}

      {/* Recorder */}
      <div className="rounded-xl border border-border bg-background/40 p-4">
        {previewUrl && hasVideo ? (
          <div className="flex flex-col items-center gap-3">
            <video src={previewUrl} controls playsInline className="mx-auto aspect-[4/3] w-full max-w-sm rounded-xl border border-border bg-black object-cover shadow-soft" />
            <div className="flex items-center gap-2 text-sm font-medium text-[oklch(0.45_0.12_150)]">
              <CheckCircle2 className="h-4 w-4" /> Video recorded ({seconds}s)
            </div>
            <Button type="button" variant="outline" onClick={retake}>
              <RotateCcw className="h-4 w-4" /> Re-record
            </Button>
          </div>
        ) : recording ? (
          <div className="flex flex-col items-center gap-3">
            <video ref={liveRef} playsInline muted className="mx-auto aspect-[4/3] w-full max-w-sm rounded-xl border-2 border-red-400 bg-black object-cover shadow-soft" />
            <div className="flex items-center gap-2 text-sm font-semibold text-red-600">
              <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-red-600" />
              Recording… {seconds}s {seconds < MIN_SECONDS ? `(min ${MIN_SECONDS}s)` : ""}
            </div>
            <Button
              type="button"
              onClick={stop}
              disabled={seconds < MIN_SECONDS}
              className="bg-red-600 text-white hover:bg-red-700 disabled:opacity-60"
            >
              <Square className="h-4 w-4" /> Stop {seconds < MIN_SECONDS ? `(${MIN_SECONDS - seconds}s)` : "& Save"}
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 py-6">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent text-primary">
              <Video className="h-7 w-7" />
            </div>
            <p className="text-sm text-muted-foreground">
              {agree ? "Click 'Start Recording' to begin" : "Accept the declaration above to enable recording"}
            </p>
            <Button
              type="button"
              onClick={() => setConsentOpen(true)}
              disabled={!agree}
              className="bg-primary text-white hover:bg-primary/90 disabled:opacity-60"
            >
              <Video className="h-4 w-4" /> Start Recording
            </Button>
          </div>
        )}
      </div>

      <Dialog open={consentOpen} onOpenChange={setConsentOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Video className="h-5 w-5 text-primary" /> Consent for camera access</DialogTitle>
            <DialogDescription className="space-y-2 pt-1 text-left">
              <span className="block text-foreground">I agree to read the above declaration clearly on video and show my identity document (Aadhaar/PAN) during recording.</span>
              <span className="block text-xs">By continuing, you allow BharatOne to access your camera and microphone to record this verification video.</span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => setConsentOpen(false)}>Cancel</Button>
            <Button type="button" className="bg-primary text-white hover:bg-primary/90" onClick={() => { setConsentOpen(false); start(); }}>
              <Video className="h-4 w-4" /> I Agree — Start Camera
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
