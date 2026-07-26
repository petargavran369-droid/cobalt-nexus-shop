// ---------- Rust WebRCON via WebSocket (FIXED) ----------
// Zahtijeva: npm i ws   (+ npm i -D @types/ws)
// Vercel: funkcija koja ovo poziva mora biti Node runtime (ne Edge).
import WebSocket from "ws";

export async function sendRconCommand(command: string): Promise<RconResult> {
  const host = process.env.RUST_RCON_HOST?.trim();
  const port = process.env.RUST_RCON_PORT?.trim();
  const password = process.env.RUST_RCON_PASSWORD;

  if (!host || !port || !password) return { ok: false, error: "RCON not configured" };
  if (!/^\d{1,5}$/.test(port)) return { ok: false, error: "Invalid RUST_RCON_PORT" };

  const url = `ws://${host}:${port}/${encodeURIComponent(password)}`;
  const identifier = Math.floor(Math.random() * 2_000_000_000) + 1;

  return new Promise<RconResult>((resolve) => {
    let settled = false;
    let ws: WebSocket | undefined;
    const seen: string[] = [];

    const finish = (result: RconResult) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      try { ws?.close(); } catch {}
      // Uvijek vrati sirovi output da se vidi u deliveries.response_payload
      resolve({ ...result, message: result.message ?? seen.join(" | ").slice(0, 500) });
    };

    const timeout = setTimeout(
      () => finish({ ok: false, error: `RCON timeout (no reply for id ${identifier})` }),
      12_000,
    );

    try {
      ws = new WebSocket(url, { handshakeTimeout: 8000 });
    } catch (e: any) {
      finish({ ok: false, error: e?.message || "RCON connect failed" });
      return;
    }

    ws.on("open", () => {
      try {
        ws!.send(JSON.stringify({ Identifier: identifier, Message: command, Name: "CobaltShop" }));
      } catch (e: any) {
        finish({ ok: false, error: e?.message || "RCON send failed" });
      }
      // NEMA optimističnog success timeouta — čekamo pravi odgovor.
    });

    ws.on("message", (raw) => {
      let parsed: any = null;
      const text = String(raw);
      try { parsed = JSON.parse(text); } catch { /* ignore */ }

      // Ignoriraj chat/log/broadcast — reagiraj SAMO na vlastiti Identifier.
      if (!parsed || Number(parsed.Identifier) !== identifier) return;

      const message = String(parsed.Message ?? "").trim();
      seen.push(message);
      const lower = message.toLowerCase();

      const failed =
        message.length === 0 ||
        lower.includes("unknown command") ||
        lower.includes("command not found") ||
        lower.includes("invalid command") ||
        lower.includes("not found") ||
        lower.includes("no permission") ||
        lower.includes("error") ||
        lower.includes("exception") ||
        lower.startsWith("usage:") ||
        lower.startsWith("syntax:");

      finish(failed ? { ok: false, error: message || "Empty RCON reply" } : { ok: true, message });
    });

    ws.on("error", (e: any) => finish({ ok: false, error: `RCON websocket error: ${e?.message ?? e}` }));
    ws.on("close", (code, reason) => {
      if (!settled) {
        finish({ ok: false, error: `RCON closed before reply (code ${code} ${String(reason)})` });
      }
    });
  });
}
