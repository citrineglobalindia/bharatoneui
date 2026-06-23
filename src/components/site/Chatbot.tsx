import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { trackChatMessage } from "@/lib/tracking";
import { MessageCircle, X, Send, Sparkles } from "lucide-react";

type Msg = { role: "bot" | "user"; text: string };

const QUICK = [
  "What services do you offer?",
  "How to register a service center?",
  "Tell me about Shreerakshe Card",
  "Contact information",
  "What documents are required for registration?",
  "What banking services are available?",
  "How can I track my application?",
  "Do you provide insurance services?",
  "How long does center approval take?",
  "Do you provide training after registration?",
];

function botReply(q: string): string {
  const t = q.toLowerCase();
  if (t.includes("document") || t.includes("documents required") || (t.includes("require") && (t.includes("regist") || t.includes("center") || t.includes("centre"))))
    return "For **Center Registration** you generally need:\n- Aadhaar Card\n- PAN Card\n- Passport-size Photograph\n- Mobile Number\n- Email ID\n- Bank Account Details\n- Address Proof";
  if (t.includes("banking") || t.includes("aeps") || t.includes("dmt") || t.includes("money transfer"))
    return "Our **banking services** include:\n- AEPS Cash Withdrawal\n- Domestic Money Transfer (DMT)\n- Balance Enquiry\n- Mini Statement\n- Cash Deposit Services\n- Account Opening Assistance\n- Other digital banking services";
  if (t.includes("track") || t.includes("application status") || (t.includes("application") && t.includes("id")))
    return "You can track your application using the **Application ID** provided in your acknowledgment receipt.";
  if (t.includes("insurance"))
    return "Yes — BharatOne provides **General, Life, Health and Personal Accident Insurance** and other insurance solutions through authorized insurance partners.";
  if (t.includes("approval") || t.includes("how long") || t.includes("verification time"))
    return "Center approval is subject to **document verification and management approval**. Once verification is completed, our team will update you on the approval status.";
  if (t.includes("train"))
    return "Yes — after registration BharatOne provides **onboarding support, platform training, service guidance and operational assistance** to help your center start and run services effectively.";
  if (t.includes("service") && !t.includes("center"))
    return "We offer **100+ services** including:\n- E-Governance & Government Documents\n- Nadakacheri (Caste / Income / Residence certificates)\n- Banking, AEPS, DMT, Micro ATM\n- Bill Payments (BBPS)\n- Travel & IRCTC bookings\n- Loans & Insurance\n\nVisit our [Services page](/services) for the full list.";
  if (t.includes("register") || t.includes("center") || t.includes("centre"))
    return "Becoming a BharatOne partner is easy! 🎉\n\n1. Click **Register Center** at the top\n2. Submit your basic details & documents\n3. Our team reaches out within 24 hours\n\nCall **+91 96111 00712** to fast-track.";
  if (t.includes("shree") || t.includes("health") || t.includes("card"))
    return "**Shreerakshe Health Card** gives your family:\n- Exclusive discounts at trusted hospitals\n- Affordable quality healthcare\n- Lifesaving access when you need it most\n\nLearn more at shreerakshe.com or call +91 96111 00712.";
  if (t.includes("contact") || t.includes("phone") || t.includes("call") || t.includes("email"))
    return "📞 **+91 96111 00712**\n✉️ info@mybharatone.com\n📍 Bharatone Head Office, 10th B Cross, Krishnaraja Puram, Hassan, Karnataka 573201\n\nWe're available Mon–Sat, 9 AM – 7 PM.";
  if (t.includes("scheme"))
    return "We run welfare-driven schemes covering healthcare, education, cooperative society development, and social support. Visit the **Schemes** section to explore and apply.";
  if (t.includes("loan") || t.includes("bank"))
    return "Yes — our centers help with banking, AEPS withdrawals, money transfers, micro ATM, and loan assistance. Drop by any BharatOne center.";
  if (t.includes("hi") || t.includes("hello") || t.includes("hey"))
    return "Namaste! 🙏 I'm the BharatOne assistant. Ask me about services, registration, or schemes.";
  return "I can help with **services**, **center registration**, **Shreerakshe Card**, **schemes**, or **contact info**. What would you like to know?";
}

export function Chatbot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([
    { role: "bot", text: "Namaste! 🙏 I'm the BharatOne assistant. How can I help you today?" },
  ]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  function send(text: string) {
    const q = text.trim();
    if (!q) return;
    setMessages((m) => [...m, { role: "user", text: q }]);
    setInput("");
    setTyping(true);
    // Log the user turn
    trackChatMessage("user", q);
    setTimeout(() => {
      const reply = botReply(q);
      setMessages((m) => [...m, { role: "bot", text: reply }]);
      setTyping(false);
      // Log the assistant turn
      trackChatMessage("assistant", reply);
    }, 700);
  }

  return (
    <>
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 1.5, type: "spring" }}
        onClick={() => setOpen(true)}
        className={`fixed z-40 h-14 w-14 rounded-full bg-gradient-to-br from-[var(--saffron)] to-[var(--india-green)] text-white shadow-glow flex items-center justify-center hover:scale-110 transition-transform bottom-[max(1.25rem,env(safe-area-inset-bottom))] right-5 ${open ? "opacity-0 pointer-events-none" : ""}`}
        aria-label="Open chat"
      >
        <span className="absolute inset-0 rounded-full bg-[var(--saffron)] animate-ping opacity-30" />
        <MessageCircle className="relative h-6 w-6" />
        <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-[var(--india-green)] ring-2 ring-background animate-pulse" />
      </motion.button>

      <AnimatePresence>
        {open && (
          <>
            {/* Mobile backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-40 bg-foreground/40 backdrop-blur-sm sm:hidden"
            />
            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 30, scale: 0.95 }}
              transition={{ duration: 0.25 }}
              className="fixed z-50 bg-card border border-border flex flex-col overflow-hidden shadow-elegant
                inset-x-0 bottom-0 top-16 rounded-t-3xl
                sm:inset-auto sm:top-auto sm:bottom-5 sm:right-5 sm:w-[400px] sm:h-[600px] sm:max-h-[calc(100vh-2.5rem)] sm:rounded-2xl"
            >
              {/* Header */}
              <div className="bg-gradient-to-br from-[var(--saffron)] to-[var(--india-green)] text-white px-4 py-3 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="h-10 w-10 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-semibold text-sm">BharatOne</div>
                    <div className="text-[11px] opacity-90 flex items-center gap-1">
                      <span className="relative flex h-1.5 w-1.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-white" />
                      </span>
                      Online · Replies instantly
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="h-9 w-9 rounded-full hover:bg-white/20 flex items-center justify-center transition-colors"
                  aria-label="Close chat"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 space-y-3 bg-muted/30">
                {messages.map((m, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm whitespace-pre-line shadow-sm ${
                        m.role === "user"
                          ? "bg-gradient-to-br from-[var(--saffron)] to-[var(--india-green)] text-white rounded-br-sm"
                          : "bg-card border border-border rounded-bl-sm"
                      }`}
                      dangerouslySetInnerHTML={{
                        __html: m.text
                          .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
                          .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" class="underline">$1</a>')
                          .replace(/\n/g, "<br/>"),
                      }}
                    />
                  </motion.div>
                ))}
                {typing && (
                  <div className="flex justify-start">
                    <div className="bg-card border border-border rounded-2xl rounded-bl-sm px-4 py-3 flex gap-1">
                      {[0, 0.15, 0.3].map((d) => (
                        <motion.span
                          key={d}
                          animate={{ y: [0, -4, 0] }}
                          transition={{ repeat: Infinity, duration: 0.8, delay: d }}
                          className="h-1.5 w-1.5 rounded-full bg-muted-foreground"
                        />
                      ))}
                    </div>
                  </div>
                )}
                <div ref={endRef} />
              </div>

              {/* Quick replies */}
              {messages.length <= 2 && (
                <div className="px-3 pb-2 pt-1 flex flex-wrap gap-1.5 shrink-0 bg-muted/30">
                  {QUICK.map((q) => (
                    <button
                      key={q}
                      onClick={() => send(q)}
                      className="text-xs px-2.5 py-1.5 rounded-full bg-card hover:bg-[var(--saffron)]/15 hover:text-[var(--saffron)] border border-border transition-colors"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              )}

              {/* Input */}
              <form
                onSubmit={(e) => { e.preventDefault(); send(input); }}
                className="border-t border-border p-2 flex gap-2 bg-card shrink-0 pb-[max(0.5rem,env(safe-area-inset-bottom))]"
              >
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask anything…"
                  className="flex-1 px-3 py-2.5 text-sm rounded-xl bg-muted focus:outline-none focus:ring-2 focus:ring-[var(--saffron)]"
                />
                <button
                  type="submit"
                  aria-label="Send"
                  className="h-10 w-10 shrink-0 rounded-xl bg-gradient-to-br from-[var(--saffron)] to-[var(--india-green)] text-white flex items-center justify-center hover:scale-105 transition-transform disabled:opacity-50"
                  disabled={!input.trim()}
                >
                  <Send className="h-4 w-4" />
                </button>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

