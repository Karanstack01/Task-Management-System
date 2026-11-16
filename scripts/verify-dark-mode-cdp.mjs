// Connect to Chrome DevTools Protocol on port 9222
async function run() {
  console.log("Connecting to headless browser on http://127.0.0.1:9222/json ...");
  const res = await fetch("http://127.0.0.1:9222/json");
  const targets = await res.json();
  const pageTarget = targets.find(t => t.type === "page");
  if (!pageTarget) {
    console.error("No page target found");
    process.exit(1);
  }

  const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);
  let id = 1;

  function send(method, params = {}) {
    return new Promise((resolve) => {
      const msgId = id++;
      const handler = (evt) => {
        const msg = JSON.parse(evt.data);
        if (msg.id === msgId) {
          ws.removeEventListener("message", handler);
          resolve(msg.result);
        }
      };
      ws.addEventListener("message", handler);
      ws.send(JSON.stringify({ id: msgId, method, params }));
    });
  }

  await new Promise((r) => ws.addEventListener("open", r));
  console.log("Connected to browser WebSocket!");

  // Wait 1 second for page hydration
  await new Promise((r) => setTimeout(r, 1000));

  // 1. Check initial state
  const evalInitial = await send("Runtime.evaluate", {
    expression: `JSON.stringify({
      classList: Array.from(document.documentElement.classList),
      dataTheme: document.documentElement.getAttribute("data-theme"),
      bodyBg: window.getComputedStyle(document.body).backgroundColor,
      bodyColor: window.getComputedStyle(document.body).color
    })`,
    returnByValue: true
  });
  console.log("Initial Theme State:", evalInitial.result.value);

  // 2. Click the toggle button in the header
  const clickResult = await send("Runtime.evaluate", {
    expression: `(() => {
      const btn = document.querySelector('button[aria-label="Toggle theme"]');
      if (!btn) return "Button not found";
      btn.click();
      return "Clicked theme button";
    })()`,
    returnByValue: true
  });
  console.log("Click result:", clickResult.result.value);

  // Wait 700ms for View Transition wipe animation to finish
  await new Promise((r) => setTimeout(r, 700));

  // 3. Inspect dark mode state
  const evalAfterClick = await send("Runtime.evaluate", {
    expression: `JSON.stringify({
      classList: Array.from(document.documentElement.classList),
      dataTheme: document.documentElement.getAttribute("data-theme"),
      bodyBg: window.getComputedStyle(document.body).backgroundColor,
      bodyColor: window.getComputedStyle(document.body).color,
      h1Color: (() => {
        const h1 = document.querySelector('h1');
        return h1 ? window.getComputedStyle(h1).color : null;
      })(),
      cardBg: (() => {
        const card = document.querySelector('.liquid-card');
        return card ? window.getComputedStyle(card).backgroundColor : null;
      })()
    })`,
    returnByValue: true
  });
  console.log("After Click (Dark Mode State):", evalAfterClick.result.value);

  const state = JSON.parse(evalAfterClick.result.value);

  let success = true;
  if (!state.classList.includes("dark")) {
    console.error("FAIL: <html> does not contain 'dark' class!");
    success = false;
  } else {
    console.log("SUCCESS: <html> contains 'dark' class!");
  }

  if (state.dataTheme !== "dark") {
    console.error("FAIL: data-theme is not 'dark'!");
    success = false;
  } else {
    console.log("SUCCESS: data-theme is 'dark'!");
  }

  if (!state.bodyBg.includes("6, 10, 24") && !state.bodyBg.includes("rgb(6, 10, 24)")) {
    console.log("Body bg:", state.bodyBg);
  } else {
    console.log("SUCCESS: Body background is Midnight Dark rgb(6, 10, 24)!");
  }

  ws.close();
  process.exit(success ? 0 : 1);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

