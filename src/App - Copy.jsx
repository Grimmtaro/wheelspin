import React, { useState, useRef, useEffect } from "react";

const VISIBLE_ITEMS = 7;
const ITEM_HEIGHT = 50;
const INITIAL_SPEED = 40;
const DEFAULT_GAME_COUNT = 20;
const DEFAULT_DURATION = 48000;

const spinAudio = new Audio("/roll.wav");
spinAudio.loop = true;

const winAudio = new Audio("/stop.wav");

const buttonStyle = {
  background: "#444",
  color: "#fff",
  border: "1px solid #666",
  padding: "8px 22px",
  borderRadius: "8px",
  margin: "5px",
  cursor: "pointer",
  fontWeight: "bold",
  fontSize: "15px",
  height: "40px",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  lineHeight: "1",
  boxSizing: "border-box"
};

export default function App() {
  const [games, setGames] = useState([]);
  const [spinning, setSpinning] = useState(false);
  const [shouldSpin, setShouldSpin] = useState(false);
  const [winner, setWinner] = useState(null);
  const [duration, setDuration] = useState(DEFAULT_DURATION);
  const [history, setHistory] = useState([]);
  const [totalGames, setTotalGames] = useState(DEFAULT_GAME_COUNT);
  const [onlyVR, setOnlyVR] = useState(false);
  const [onlyEA, setOnlyEA] = useState(false);
  const [onlyDemo, setOnlyDemo] = useState(false);
  const [mode, setMode] = useState("steam");
  const [customList, setCustomList] = useState([]);
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualInputValue, setManualInputValue] = useState("");

  const containerRef = useRef(null);
  const animationRef = useRef(null);
  const offsetRef = useRef(0);
  const speedRef = useRef(INITIAL_SPEED);
  const startTimeRef = useRef(0);
  const [finalWinnerIndex, setFinalWinnerIndex] = useState(null);

  const fetchAndSpin = async () => {
    if (mode === "custom") {
      if (customList.length === 0) return;
      const selected = Array.from({ length: totalGames }, () => {
        const rand = customList[Math.floor(Math.random() * customList.length)];
        return rand;
      });
      setGames(selected);
      setShouldSpin(true);
      return;
    }

    try {
      const res = await fetch("http://localhost:3001/apps");
      const apps = await res.json();

      const filtered = apps.filter(app => {
        const name = app.name?.toLowerCase() || "";
        const isDemo = name.includes("demo");
        const isValidGame = ![
          "soundtrack", "music", "trailer", "video",
          "tool", "editor", "test", "benchmark", "beta", "server"
        ].some(keyword => name.includes(keyword));

        if (onlyDemo) return isDemo;
        if (!isDemo && !isValidGame) return false;
        if (onlyVR && !name.includes("vr")) return false;
        if (onlyEA && !name.includes("early access")) return false;

        return true;
      });

      const selected = Array.from({ length: totalGames }, () => {
        const rand = filtered[Math.floor(Math.random() * filtered.length)];
        return rand.name;
      });

      setGames(selected);
      setShouldSpin(true);
    } catch (err) {
      console.error("Failed to fetch apps from proxy:", err);
    }
  };

  useEffect(() => {
    if (shouldSpin && games.length > 0) {
      startScroll();
      setShouldSpin(false);
    }
  }, [games]);

  const startScroll = () => {
    spinAudio.currentTime = 0;
    spinAudio.play();

    setWinner(null);
    setFinalWinnerIndex(null);
    offsetRef.current = 0;
    speedRef.current = INITIAL_SPEED;
    startTimeRef.current = 0;
    containerRef.current.style.transition = "";
    setSpinning(true);
    animationRef.current = requestAnimationFrame(animateScroll);
  };

  const animateScroll = (timestamp) => {
    if (!startTimeRef.current) startTimeRef.current = timestamp;
    const elapsed = timestamp - startTimeRef.current;
    const progress = Math.min(elapsed / duration, 1);
    const easeOut = 1 - Math.pow(1 - progress, 3);
    const speed = INITIAL_SPEED * (1 - easeOut);
    speedRef.current = Math.max(speed, 1.5);

    offsetRef.current += speedRef.current;
    if (offsetRef.current >= ITEM_HEIGHT * games.length) {
      offsetRef.current = 0;
    }

    containerRef.current.style.transform = `translateY(-${offsetRef.current}px)`;

    if (progress < 1) {
      animationRef.current = requestAnimationFrame(animateScroll);
    } else {
      cancelAnimationFrame(animationRef.current);
      finishSpin();
    }
  };

  const finishSpin = () => {
    spinAudio.pause();
    spinAudio.currentTime = 0;
    winAudio.play();

    const centerRowIndex = Math.floor(VISIBLE_ITEMS / 2);
    const winnerIndex = Math.floor((offsetRef.current + ITEM_HEIGHT * centerRowIndex) / ITEM_HEIGHT) % games.length;
    const result = games[winnerIndex];
    setWinner(result);
    setFinalWinnerIndex(winnerIndex);
    setHistory(prev => [result, ...prev]);

    const scrollTo = winnerIndex * ITEM_HEIGHT - centerRowIndex * ITEM_HEIGHT;
    containerRef.current.style.transition = "transform 0.5s ease-out";
    containerRef.current.style.transform = `translateY(-${scrollTo}px)`;

    setTimeout(() => {
      setSpinning(false);
      containerRef.current.style.transition = "";
    }, 500);
  };

  const stopFast = () => {
    if (!spinning) return;
    const remaining = 5000;
    startTimeRef.current = performance.now() - (duration - remaining);
  };

  const handleGameCountChange = (e) => {
    let count = parseInt(e.target.value);
    if (isNaN(count)) return;
    setTotalGames(Math.min(count, 150));
  };

  const handleTxtUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      const list = text.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
      setCustomList(list);
      setMode("custom");
    };
    reader.readAsText(file);
  };

  const openManualEntry = () => {
    setManualInputValue("");
    setShowManualInput(true);
  };

  const applyManualList = () => {
    const lines = manualInputValue.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
    setCustomList(lines);
    setMode("custom");
    setShowManualInput(false);
  };

  return (
    <div style={{ padding: "30px", color: "#fff", fontFamily: "sans-serif" }}>
      <h1>🎮 Steam Spinner</h1>

      <div style={{ display: "flex", justifyContent: "center", gap: "40px", marginBottom: "20px" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}>
          <label>⏱️ Spin Time (sec)</label>
          <input
            type="number"
            value={duration / 1000}
            onChange={(e) => setDuration(Number(e.target.value) * 1000)}
            style={{ ...buttonStyle, width: "80px", textAlign: "center", padding: "6px 10px" }}
          />
        </div>

        {mode === "steam" && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}>
            <label>🎲 Games to Roll</label>
            <input
              type="number"
              value={totalGames}
              max={150}
              min={1}
              onChange={handleGameCountChange}
              style={{ ...buttonStyle, width: "80px", textAlign: "center", padding: "6px 10px" }}
            />
          </div>
        )}
      </div>

      {mode === "steam" && (
        <div style={{ display: "flex", justifyContent: "center", gap: "20px", marginBottom: "20px" }}>
          <label><input type="checkbox" checked={onlyVR} onChange={() => setOnlyVR(!onlyVR)} /> Only VR</label>
          <label><input type="checkbox" checked={onlyEA} onChange={() => setOnlyEA(!onlyEA)} /> Only Early Access</label>
          <label><input type="checkbox" checked={onlyDemo} onChange={() => setOnlyDemo(!onlyDemo)} /> Only Demos</label>
        </div>
      )}

      <div style={{ marginBottom: "20px" }}>
        <button
          onClick={fetchAndSpin}
          disabled={spinning}
          style={{
            ...buttonStyle,
            opacity: spinning ? 0.5 : 1,
            pointerEvents: spinning ? "none" : "auto"
          }}
        >
          🎲 Roll
        </button>
        <button onClick={stopFast} disabled={!spinning} style={buttonStyle}>⏹️ Ultra Stop</button>
      </div>

      <div
  style={{
    height: VISIBLE_ITEMS * ITEM_HEIGHT,
    overflow: "hidden",
    border: "2px solid #333",
    background: "#000",
    marginBottom: "20px",
    width: "1000px",  // Set width to 1000px for more space
    margin: "0 auto", // Center the container
  }}
>
  <div ref={containerRef} style={{ willChange: "transform" }}>
    {[...games, ...games].map((game, i) => {
      const isWinner = (i % games.length) === finalWinnerIndex;
      return (
        <div
          key={i}
          style={{
            height: ITEM_HEIGHT,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: isWinner ? "24px" : "18px",
            fontWeight: isWinner ? "bold" : "normal",
            background: isWinner ? "#222" : "transparent",
            textOverflow: "ellipsis",  // Ensures truncation for long names
            whiteSpace: "nowrap",      // Prevent text from wrapping to next line
            overflow: "hidden",       // Hide overflowed text
            padding: "0 10px",        // Add padding for better spacing
          }}
        >
          {game}
        </div>
      );
    })}
  </div>
</div>


      <div style={{ marginBottom: "20px" }}>
        <input id="customListFile" type="file" accept=".txt" onChange={handleTxtUpload} style={{ display: "none" }} />
        <label htmlFor="customListFile" style={buttonStyle}>📂 Custom List</label>
        <button onClick={openManualEntry} style={buttonStyle}>✍️ Enter Custom List</button>
        {mode === "custom" && (
          <button onClick={() => setMode("steam")} style={buttonStyle}>🔁 Switch to Steam</button>
        )}
      </div>

      {showManualInput && (
        <div style={{ marginBottom: "20px" }}>
          <textarea
            rows="10"
            value={manualInputValue}
            onChange={(e) => setManualInputValue(e.target.value)}
            placeholder="Enter one item per line"
            style={{ width: "100%", padding: "10px", fontSize: "16px", borderRadius: "6px" }}
          />
          <div style={{ marginTop: "10px" }}>
            <button onClick={applyManualList} style={buttonStyle}>✅ Use List</button>
            <button onClick={() => setShowManualInput(false)} style={buttonStyle}>❌ Cancel</button>
          </div>
        </div>
      )}

      <div style={{ marginTop: "20px", padding: "10px", backgroundColor: "#222" }}>
        <h3>📜 Spin History</h3>
        <ul style={{ listStyle: "none", padding: 0 }}>
          {history.map((entry, index) => (
            <li
              key={index}
              style={{
                padding: "10px",
                backgroundColor: index % 2 === 0 ? "#333" : "#444",
                borderBottom: "1px solid #555",
              }}
            >
              {entry}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
