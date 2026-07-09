import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { apiService } from "../../services/Api";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api/v1";
const PRODUCT_DETAILS_PREFIX = import.meta.env.VITE_PRODUCT_DETAILS_PATH_PREFIX || "/product";

// Bubbles
const BotBubble = ({ children }) => (
  <div className="max-w-[85%] rounded-2xl bg-white border border-gray-200 shadow px-4 py-3 text-gray-900">
    {children}
  </div>
);
const UserBubble = ({ children }) => (
  <div className="max-w-[85%] rounded-2xl bg-blue-600 text-white shadow px-4 py-3">{children}</div>
);
const QuickReply = ({ label, onClick }) => (
  <button
    onClick={onClick}
    className="px-3 py-1.5 rounded-full border border-gray-200 bg-white hover:bg-blue-50 text-sm text-gray-700"
  >
    {label}
  </button>
);

const ProductCard = ({ p, onAdd }) => (
  <div className="w-64 flex-shrink-0 bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
    <div className="h-36 bg-gray-50">
      <img
        src={p.image || (Array.isArray(p.allImages) && p.allImages[0]) || "/placeholder-image.jpg"}
        alt={p.title}
        className="w-full h-full object-cover"
        onError={(e) => (e.currentTarget.src = "/placeholder-image.jpg")}
      />
    </div>
    <div className="p-3">
      <div className="font-medium text-gray-900 line-clamp-2">{p.title}</div>
      <div className="mt-1 text-sm text-gray-600 line-clamp-2">
        {p.short_description || p.description || "—"}
      </div>
      <div className="mt-2 font-semibold">{Number(p.price || 0).toLocaleString()} USD</div>
      <div className="mt-3 flex gap-2">
        <Link
          to={`${PRODUCT_DETAILS_PREFIX}/${p.id || p._id}`}
          className="px-3 py-1.5 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 text-sm"
        >
          View
        </Link>
        <button
          onClick={() => onAdd(p)}
          className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700"
        >
          Add to Cart
        </button>
      </div>
    </div>
  </div>
);

export default function ChatBotWidget() {
  const [open, setOpen] = useState(false); // closed by default
  const [sessionId] = useState(() => crypto.randomUUID());
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [ctx, setCtx] = useState({ flow: null, step: null, name: null, email: null, last_intent: null });
  const [typing, setTyping] = useState(false);
  const viewportRef = useRef(null);
  const gateRef = useRef(0); // request gate to avoid stale responses

  // greet only when panel opens
  useEffect(() => {
    if (!open) return;
    setMessages([
      { id: crypto.randomUUID(), from: "bot", type: "text", text: "Hi! 👋" },
      { id: crypto.randomUUID(), from: "bot", type: "text", text: "I can help with products, pricing, seller info, or a custom chatbot." },
      { id: crypto.randomUUID(), from: "bot", type: "text", text: "What would you like to explore?", quickReplies: ["Products","Pricing","Seller info","Custom chatbot"] },
    ]);
  }, [open]);

  // auto-scroll
  useEffect(() => {
    viewportRef.current?.scrollTo({ top: viewportRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, typing]);

  const pushBotSequence = async (sequence) => {
    for (const msg of sequence) {
      setTyping(true);
      await new Promise((r) => setTimeout(r, 420));
      setTyping(false);
      setMessages((m) => [...m, { id: crypto.randomUUID(), from: "bot", ...msg }]);
    }
  };

  const showProductsFromAPI = async (params, gateId) => {
    try {
      const result = await apiService.getProducts({
        limit: params?.limit ?? 6,
        sort_by: params?.sort_by ?? "created_at",
        sort_order: params?.sort_order ?? "desc",
      });
      if (gateId !== gateRef.current) return; // ignore stale

      const raw = Array.isArray(result?.products)
        ? result.products
        : Array.isArray(result) ? result : result?.data || [];

      const normalized = raw.map((p) => ({
        id: p._id || p.id,
        title: p.title || "Untitled",
        description: p.description,
        short_description: p.short_description,
        price: p.price || 0,
        image: Array.isArray(p.images) ? p.images[0] : p.image,
        allImages: p.images || [],
      }));

      setMessages((m) => [
        ...m,
        { id: crypto.randomUUID(), from: "bot", type: "product_list", products: normalized },
      ]);
    } catch {
      await pushBotSequence([{ type: "text", text: "Sorry—couldn’t load products. Please try again." }]);
    }
  };

  const sendToBackend = async (text) => {
    const res = await fetch(`${API_BASE}/chatbot/message`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_id: sessionId, message: text, context: ctx }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  };

  const onSend = async (text) => {
    const trimmed = (text ?? input).trim();
    if (!trimmed) return;

    setMessages((m) => [...m, { id: crypto.randomUUID(), from: "user", type: "text", text: trimmed }]);
    setInput("");

    const myGate = ++gateRef.current;

    try {
      const data = await sendToBackend(trimmed);
      if (myGate !== gateRef.current) return; // ignore stale

      if (data.context) setCtx(data.context);

      if (Array.isArray(data.messages) && data.messages.length) {
        await pushBotSequence(data.messages);
      }
      if (data.action === "show_products") {
        await showProductsFromAPI(data.params, myGate);
      }
    } catch {
      if (myGate !== gateRef.current) return;
      await pushBotSequence([{ type: "text", text: "Sorry—something went wrong. Please try again." }]);
    }
  };

  const onQuick = (label) => onSend(label);

  return (
    <>
      {/* FAB toggle (closed by default) */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-5 right-5 z-50 h-12 w-12 rounded-full bg-blue-600 text-white shadow-xl grid place-items-center hover:bg-blue-700"
        aria-label="Open chat"
      >
        {open ? "×" : "N"}
      </button>

      {open && (
        <div className="fixed bottom-20 right-5 z-50 w-[360px] max-w-[92vw]">
          <div className="bg-white/90 backdrop-blur rounded-2xl shadow-2xl border border-gray-200 flex flex-col h-[440px]">
            {/* Header */}
            <div className="px-4 py-3 border-b border-gray-200 flex items-center gap-2">
              <div className="h-9 w-9 rounded-full bg-blue-600 text-white grid place-items-center font-semibold">N</div>
              <div>
                <div className="font-semibold text-gray-900">Nozama Assistant</div>
                <div className="text-xs text-gray-500">Ask about products, pricing, seller info, or a custom chatbot</div>
              </div>
            </div>

            {/* Messages */}
            <div ref={viewportRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-3 bg-gray-50">
              {messages.map((m) => (
                <div key={m.id} className={`flex ${m.from === "bot" ? "justify-start" : "justify-end"}`}>
                  {m.from === "bot" ? (
                    <div className="flex gap-2">
                      <div className="h-7 w-7 rounded-full bg-blue-600 text-white grid place-items-center text-xs mt-1">N</div>
                      <div>
                        {m.type === "text" && (
                          <BotBubble>
                            <div className="whitespace-pre-line">{m.text}</div>
                            {!!m.quickReplies?.length && (
                              <div className="mt-3 flex flex-wrap gap-2">
                                {m.quickReplies.map((q) => (
                                  <QuickReply key={q} label={q} onClick={() => onQuick(q)} />
                                ))}
                              </div>
                            )}
                          </BotBubble>
                        )}
                        {m.type === "product_list" && (
                          <BotBubble>
                            <div className="font-medium mb-2">Featured products</div>
                            <div className="flex gap-3 overflow-x-auto pb-2">
                              {m.products?.map((p) => (
                                <ProductCard key={p.id} p={p} onAdd={() => onQuick(`Add ${p.title} to cart`)} />
                              ))}
                            </div>
                            <div className="mt-2 flex gap-2">
                              <QuickReply label="Show more" onClick={() => onQuick("more info")} />
                              <QuickReply label="Pricing" onClick={() => onQuick("pricing")} />
                              <QuickReply label="Main menu" onClick={() => onQuick("main menu")} />
                            </div>
                          </BotBubble>
                        )}
                      </div>
                    </div>
                  ) : (
                    <UserBubble>{m.text}</UserBubble>
                  )}
                </div>
              ))}

              {/* typing */}
              {typing && (
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-full bg-blue-600 text-white grid place-items-center text-xs">N</div>
                  <div className="px-4 py-2 bg-white border border-gray-200 rounded-full shadow">
                    <span className="inline-block w-2 h-2 rounded-full bg-gray-400 animate-bounce [animation-delay:0ms]" />
                    <span className="inline-block w-2 h-2 rounded-full bg-gray-400 animate-bounce mx-1 [animation-delay:120ms]" />
                    <span className="inline-block w-2 h-2 rounded-full bg-gray-400 animate-bounce [animation-delay:240ms]" />
                  </div>
                </div>
              )}
            </div>

            {/* Composer */}
            <div className="p-3 border-t border-gray-200 flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && onSend(input)}
                placeholder="Type your message…"
                className="flex-1 px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
              <button
                onClick={() => onSend(input)}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
