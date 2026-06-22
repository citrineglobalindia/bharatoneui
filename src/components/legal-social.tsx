import { Facebook, Youtube, Instagram, Linkedin } from "lucide-react";

function ThreadsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M12.2 0C6.4 0 3.3 3.5 3.3 8.6c0 4.1 1.7 6.7 4.6 6.7.8 0 1.4-.3 1.8-.8.3-.4.5-.9.6-1.4.1-.4.1-.7.1-1.1v-.5h-.5c-.8 0-1.4-.2-1.9-.6-.4-.4-.6-.9-.6-1.6 0-.7.3-1.3.7-1.7.5-.4 1.1-.6 1.9-.6.8 0 1.4.2 1.9.6.4.4.6.9.6 1.6v4.3c0 2.4-.6 4.2-1.7 5.4-1.2 1.3-3 1.9-5.3 1.9-2.5 0-4.4-.8-5.7-2.4C1.1 17.9.5 15.7.5 13c0-3 .9-5.5 2.6-7.4C4.8 3.7 7.2 2.7 10 2.7c2.9 0 5.2.9 6.8 2.6 1.6 1.7 2.4 4 2.4 6.9 0 3.2-.7 5.6-2.1 7.3-1.3 1.6-3.3 2.4-5.8 2.4z" />
    </svg>
  );
}

export function LegalSocial() {
  const cls = "grid h-9 w-9 place-items-center rounded-full border border-border bg-card text-muted-foreground shadow-soft transition-colors hover:text-india-green hover:border-india-green/40";
  return (
    <div className="mt-6 flex items-center justify-center gap-3">
      <a href="https://www.instagram.com/bharatone__official?igsh=MXgxeXdyZXZzenQ2ZQ==" target="_blank" rel="noopener noreferrer" aria-label="Instagram" className={cls}><Instagram className="h-4 w-4" /></a>
      <a href="https://www.facebook.com/share/14ehHxTsSc7/" target="_blank" rel="noopener noreferrer" aria-label="Facebook" className={cls}><Facebook className="h-4 w-4" /></a>
      <a href="https://youtube.com/@bharatone-n3m5m?si=nm29R-B94J0EpnJb" target="_blank" rel="noopener noreferrer" aria-label="YouTube" className={cls}><Youtube className="h-4 w-4" /></a>
      <a href="https://www.linkedin.com/company/bharatone-services-and-affiliates-private-limited/" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn" className={cls}><Linkedin className="h-4 w-4" /></a>
      <a href="https://www.threads.com/@bharatone__official" target="_blank" rel="noopener noreferrer" aria-label="Threads" className={cls}><ThreadsIcon className="h-4 w-4" /></a>
    </div>
  );
}
