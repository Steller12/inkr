import React, { useRef, useEffect, useState } from "react";
import { FaPen, FaEraser, FaTrash, FaUser } from "react-icons/fa";

// --- Config ---
const COLORS = [
  "#fff2cc", "#ffe599", "#b45f06", "#ffffff",
  "#f6b26b", "#f9cb9c", "#783f04", "#d9d9d9",
  "#f4cccc", "#ea9999", "#cc0000", "#999999",
  "#d9ead3", "#93c47d", "#38761d", "#666666",
  "#cfe2f3", "#6fa8dc", "#0b5394", "#000000",
  "#d9d2e9", "#8e7cc3", "#674ea7", "#a64d79"
];
const CanvasBoard = () => {
  const gridCanvasRef   = useRef(null);
  const drawCanvasRef   = useRef(null);
  const isDrawing       = useRef(false);
  const lastToolRef     = useRef("pen");
  const lastColorRef    = useRef("#111");
  const lastThickRef    = useRef(4);
  const pointsRef       = useRef([]); // stores current stroke points

  // UI state
  const [tool,      setTool]      = useState("pen");
  const [color,     setColor]     = useState("#111");
  const [thickness, setThickness] = useState(4);

  // Sync refs
  useEffect(() => { lastToolRef.current  = tool;   }, [tool]);
  useEffect(() => { lastColorRef.current = color;  }, [color]);
  useEffect(() => { lastThickRef.current = thickness; }, [thickness]);

  // ---------- Canvas setup ----------
  useEffect(() => {
    const gridC  = gridCanvasRef.current;
    const drawC  = drawCanvasRef.current;
    const gCtx   = gridC.getContext("2d");
    const dCtx   = drawC.getContext("2d");

    const applyCtxDefaults = () => {
      dCtx.lineJoin               = "round";
      dCtx.lineCap                = "round";
      dCtx.imageSmoothingEnabled  = true;
      dCtx.imageSmoothingQuality  = "high";
    };

    const resize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      gridC.width = drawC.width = w;
      gridC.height = drawC.height = h;
      drawGrid(gCtx, w, h);
      applyCtxDefaults();
    };

    const drawGrid = (ctx, w, h) => {
      const gap = 75;
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = "#e0e0e0";
      ctx.lineWidth = 0.5;
      for (let x = 0; x <= w; x += gap) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,h); ctx.stroke(); }
      for (let y = 0; y <= h; y += gap) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(w,y); ctx.stroke(); }
    };

    resize();
    window.addEventListener("resize", resize);

    // ---------- Drawing helpers ----------
    const getPos = e => ({
      x: e.clientX - drawC.getBoundingClientRect().left,
      y: e.clientY - drawC.getBoundingClientRect().top
    });

    const setStrokeStyle = () => {
      if (lastToolRef.current === "eraser") {
        dCtx.globalCompositeOperation = "destination-out";
        dCtx.strokeStyle = "rgba(0,0,0,1)";
        dCtx.lineWidth   = 20;
      } else {
        dCtx.globalCompositeOperation = "source-over";
        dCtx.strokeStyle = lastColorRef.current;
        dCtx.lineWidth   = lastThickRef.current;
      }
    };

    // ---------- Event handlers ----------
    const start = e => {
      isDrawing.current = true;
      pointsRef.current = [];
      const p = getPos(e);
      pointsRef.current.push(p, p); // duplicate first point for curve seed
      setStrokeStyle();
    };

    const move = e => {
      if (!isDrawing.current) return;
      const p = getPos(e);
      pointsRef.current.push(p);
      if (pointsRef.current.length < 3) return;

      const pts = pointsRef.current;
      dCtx.beginPath();
      dCtx.moveTo(pts[0].x, pts[0].y);
      // draw quadratic curves through mid‑points
      for (let i = 1; i < pts.length - 2; i++) {
        const midX = (pts[i].x + pts[i+1].x)/2;
        const midY = (pts[i].y + pts[i+1].y)/2;
        dCtx.quadraticCurveTo(pts[i].x, pts[i].y, midX, midY);
      }
      const penult = pts[pts.length-2];
      const last   = pts[pts.length-1];
      dCtx.quadraticCurveTo(penult.x, penult.y, last.x, last.y);
      dCtx.stroke();

      // keep points array short for perf
      if (pts.length > 50) {
        pts.splice(0, pts.length - 50);
      }
    };

    const end = () => {
      if (!isDrawing.current) return;
      isDrawing.current = false;
      pointsRef.current = [];
      dCtx.closePath();
    };

    // ---------- Register listeners ----------
    drawC.addEventListener("mousedown", start);
    drawC.addEventListener("mousemove", move);
    drawC.addEventListener("mouseup",   end);
    drawC.addEventListener("mouseleave", end);

    return () => {
      drawC.removeEventListener("mousedown", start);
      drawC.removeEventListener("mousemove", move);
      drawC.removeEventListener("mouseup",   end);
      drawC.removeEventListener("mouseleave", end);
      window.removeEventListener("resize", resize);
    };
  }, []);

  // ---------- Clear helper ----------
  const clearCanvas = () => {
    const ctx = drawCanvasRef.current.getContext("2d");
    ctx.clearRect(0,0,drawCanvasRef.current.width, drawCanvasRef.current.height);
  };

  return (
    <>
      {/* canvases */}
      <canvas ref={gridCanvasRef}  style={{position:"absolute",top:0,left:0,zIndex:0}} />
      <canvas ref={drawCanvasRef}  style={{position:"absolute",top:0,left:0,zIndex:1,cursor:tool==="eraser"?"cell":"crosshair"}} />

      {/* top‑left logo */}
      <div style={{position:"fixed",top:16,left:16,background:"#ffffffdd",borderRadius:12,padding:"8px 16px",fontWeight:"bold",boxShadow:"0 2px 8px rgba(0,0,0,0.1)",zIndex:100}}>Whiteboard</div>

      {/* delete */}
      <div style={{position:"fixed",top:16,left:"50%",transform:"translateX(-50%)",zIndex:100}}>
        <button onClick={clearCanvas} style={{background:"#fff",border:"1px solid #ccc",padding:"6px 12px",borderRadius:10,boxShadow:"0 2px 6px rgba(0,0,0,0.1)",cursor:"pointer"}}><FaTrash/> Delete Board</button>
      </div>

      {/* share placeholder */}
      <div style={{position:"fixed",top:16,right:16,display:"flex",alignItems:"center",gap:8,background:"#ffffffdd",padding:"6px 10px",borderRadius:12,boxShadow:"0 2px 6px rgba(0,0,0,0.1)",zIndex:100}}>
        <FaUser size={20}/>
        <button style={{background:"#4a6cf7",color:"#fff",border:"none",borderRadius:8,padding:"6px 12px",fontWeight:"bold",cursor:"pointer"}}>Share board</button>
      </div>

      {/* sidebar */}
      <div style={{position:"fixed",top:"50%",left:16,transform:"translateY(-50%)",display:"flex",flexDirection:"column",gap:8,zIndex:10}}>
        {/* pen button & settings */}
        <div style={{position:"relative"}}>
          <button onClick={()=>setTool("pen")} style={{background:tool==="pen"?"#d0ebff":"#fff",padding:10,borderRadius:12,border:"1px solid #ccc"}}><FaPen size={20}/></button>
          <div style={{position:"absolute",left:50,top:"50%",transform:tool==="pen"?"translateY(-50%) scale(1)":"translateY(-50%) scale(0.95)",opacity:tool==="pen"?1:0,pointerEvents:tool==="pen"?"auto":"none",transition:"all 0.3s ease",background:"#fff",border:"1px solid #ccc",borderRadius:10,padding:8,boxShadow:"0 2px 6px rgba(0,0,0,0.1)",display:"flex",flexDirection:"column",gap:8,width:130}}>
            <input type="range" min={1} max={20} value={thickness} onChange={e=>setThickness(+e.target.value)} style={{width:"100%"}} />
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:4}}>
              {COLORS.map(c=> <div key={c} onClick={()=>setColor(c)} style={{width:20,height:20,borderRadius:"50%",background:c,border:color===c?"2px solid #000":"1px solid #ccc",cursor:"pointer"}} />)}
            </div>
          </div>
        </div>
        {/* eraser */}
        <button onClick={()=>setTool("eraser")} style={{background:tool==="eraser"?"#ffd6d6":"#fff",padding:10,borderRadius:12,border:"1px solid #ccc"}}><FaEraser size={20}/></button>
      </div>
    </>
  );
};

export default CanvasBoard;
