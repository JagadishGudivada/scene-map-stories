import React, { useState, useEffect, useRef } from 'react';

// ============================================================================
// 1. LANDMARK EMOJI DICTIONARY
// ============================================================================
const countryLandmarkIconMap = {
  france: "🗼",
  "united kingdom": "🇬🇧",
  uk: "🇬🇧",
  london: "🏰",
  italy: "🏟️",
  rome: "🏛️",
  india: "🕌",
  japan: "🗻",
  tokyo: "🗼",
  usa: "🗽",
  "united states": "🗽",
  brazil: "🌴",
  australia: "🦘",
  canada: "🍁",
  generic: "✈️"
};

const getLandmarkEmoji = (countryName) => {
  if (!countryName) return countryLandmarkIconMap.generic;
  const cleanName = countryName.toLowerCase().trim();
  return countryLandmarkIconMap[cleanName] || countryLandmarkIconMap.generic;
};

// ============================================================================
// 2. PASSPORT STAMP COMPONENT
// ============================================================================
const PassportStamp = ({ 
  country = 'UNKNOWN', 
  date = 'TS TRANSIT', 
  type = 'ARRIVED', 
  color = '#1a365d', 
  shape = 'circle' 
}) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    
    // Add realistic stamping angle variation
    const randomAngle = (Math.random() * 6 - 3) * Math.PI / 180;
    ctx.translate(cx, cy);
    ctx.rotate(randomAngle);
    ctx.translate(-cx, -cy);
    
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    
    // Draw Border Frames
    ctx.lineWidth = 4;
    if (shape === 'circle') {
      ctx.beginPath(); ctx.arc(cx, cy, 76, 0, Math.PI * 2); ctx.stroke();
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(cx, cy, 70, 0, Math.PI * 2); ctx.stroke();
    } else {
      ctx.strokeRect(cx - 86, cy - 60, 172, 120);
      ctx.lineWidth = 1.5;
      ctx.strokeRect(cx - 80, cy - 54, 160, 108);
    }
    
    // Render Emoji Landmark Icon
    const emoji = getLandmarkEmoji(country);
    ctx.font = '36px serif'; 
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(emoji, cx, cy - 6);
    
    // Render Typography Texts
    ctx.font = 'bold 10px Courier New, monospace';
    ctx.fillText((type || 'TRANSIT').toUpperCase(), cx, cy - 46);
    
    ctx.font = 'bold 13px Arial Black, Impact, sans-serif';
    ctx.fillText((country || 'UNKNOWN').toUpperCase(), cx, cy + 34);
    
    ctx.font = 'bold 11px Courier New, monospace';
    ctx.fillText((date || 'OPEN').toUpperCase(), cx, cy + 50);
    
    // Grungy Ink Weathering Effect Loop
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] > 0) {
        const rand = Math.random();
        if (rand < 0.18) data[i + 3] = data[i + 3] * 0.2; 
      }
    }
    ctx.putImageData(imgData, 0, 0);
    ctx.restore();
  }, [country, date, type, color, shape]);

  return (
    <canvas 
      ref={canvasRef} 
      width={200} 
      height={200} 
      style={{ mixBlendMode: 'multiply', display: 'block', margin: '0 auto' }} 
    />
  );
};

// ============================================================================
// 3. MAIN SANDBOX EXPORT
// ============================================================================
export default function App() {
  const [testCountry, setTestCountry] = useState('France');
  const [testDate, setTestDate] = useState('14 JUL 2026');
  const [testColor, setTestColor] = useState('#0f2042');
  const [testShape, setTestShape] = useState('circle');

  const mockWallData = [
    { id: 1, country: 'France', date: '14 JUL 2025', type: 'ARRIVED', color: '#0f2042', shape: 'circle' },
    { id: 2, country: 'United Kingdom', date: '22 SEP 2025', type: 'IMMIGRATION', color: '#8c1d1d', shape: 'rectangle' },
    { id: 3, country: 'India', date: '05 MAR 2026', type: 'DEPARTED', color: '#135436', shape: 'circle' },
    { id: 4, country: undefined, date: '01 JAN 1970', type: 'TRANSIT', color: '#7b341e', shape: 'rectangle' }
  ];

  return (
    <div style={{ padding: '20px', backgroundColor: '#fdfbf7', minHeight: '100vh', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        
        <header style={{ borderBottom: '2px dashed #cbd5e1', paddingBottom: '10px', marginBottom: '20px' }}>
          <h2 style={{ margin: 0 }}>🗺️ Passport Stamp Emoji Sandbox</h2>
          <p style={{ margin: '5px 0 0 0', color: '#64748b', fontSize: '13px' }}>Testing matching dictionary configuration fields live.</p>
        </header>

        {/* Dynamic Input Form Panel */}
        <div style={{ backgroundColor: '#fff', padding: '15px', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', marginBottom: '30px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <label style={{ fontSize: '12px', fontWeight: 'bold' }}>
              Country: (Try typing France, India, UK)
              <input type="text" value={testCountry} onChange={(e) => setTestCountry(e.target.value)} style={{ width: '100%', padding: '6px', marginTop: '4px', boxSizing: 'border-box' }} />
            </label>
            <label style={{ fontSize: '12px', fontWeight: 'bold' }}>
              Date string:
              <input type="text" value={testDate} onChange={(e) => setTestDate(e.target.value)} style={{ width: '100%', padding: '6px', marginTop: '4px', boxSizing: 'border-box' }} />
            </label>
            <div style={{ display: 'flex', gap: '10px' }}>
              <label style={{ fontSize: '12px', fontWeight: 'bold', flex: 1 }}>
                Shape:
                <select value={testShape} onChange={(e) => setTestShape(e.target.value)} style={{ width: '100%', padding: '6px', marginTop: '4px' }}>
                  <option value="circle">Circle</option>
                  <option value="rectangle">Rectangle</option>
                </select>
              </label>
              <label style={{ fontSize: '12px', fontWeight: 'bold', flex: 1 }}>
                Color:
                <input type="color" value={testColor} onChange={(e) => setTestColor(e.target.value)} style={{ width: '100%', height: '32px', marginTop: '4px', padding: 0 }} />
              </label>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', borderRadius: '6px', border: '1px dashed #e2e8f0' }}>
            <PassportStamp country={testCountry} date={testDate} color={testColor} shape={testShape} />
          </div>
        </div>

        {/* Array Grid Mapping Render Area */}
        <div>
          <h3 style={{ fontSize: '16px', marginBottom: '10px' }}>User Travel Grid Array</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '15px' }}>
            {mockWallData.map((item, index) => (
              <div key={index} style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px', textAlign: 'center' }}>
                <PassportStamp 
                  country={item.country} 
                  date={item.date} 
                  type={item.type} 
                  color={item.color} 
                  shape={item.shape} 
                />
                <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
                  Prop: {String(item.country)}
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
