'use client';

import { useState, useEffect, useRef } from "react";
import Image from "next/image";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const DEFAULT_PROMPT = "A photorealistic fashion photograph. The subject from Image 1 is wearing the complete ensemble from Image 2. All original garments visible in Image 1 are completely removed and are no longer present. The items from Image 2 are mapped directly onto the subject's anatomy, fitting the body perfectly. The texture, color, and structure of the garments from Image 2 are preserved exactly.";

export default function Home() {
  const [prediction, setPrediction] = useState(null);
  const [error, setError] = useState(null);
  const [images, setImages] = useState([null, null]);
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT);
  const [loading, setLoading] = useState(false);
  
  const resultRef = useRef(null);

  const handleImageChange = (index, e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const newImages = [...images];
        newImages[index] = reader.result;
        setImages(newImages);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setPrediction(null);

    // Smooth scroll to results area
    setTimeout(() => {
      resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);

    const validImages = images.filter(img => img !== null);

    const response = await fetch("/api/predictions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt: prompt,
        images: validImages,
      }),
    });

    let prediction = await response.json();
    if (response.status !== 201) {
      setError(prediction.detail);
      setLoading(false);
      return;
    }
    setPrediction(prediction);

    while (
      prediction.status !== "succeeded" &&
      prediction.status !== "failed"
    ) {
      await sleep(1000);
      const response = await fetch(`/api/predictions/${prediction.id}`);
      prediction = await response.json();
      if (response.status !== 200) {
        setError(prediction.detail);
        setLoading(false);
        return;
      }
      setPrediction(prediction);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#F8F5F2] text-[#433E3A] font-sans selection:bg-[#EAE3DC]">
      <div className="max-w-5xl mx-auto px-5 py-8 md:py-20">
        <header className="mb-10 md:mb-16 text-center">
          <div className="inline-block px-3 py-1 mb-4 border border-[#D9D1C7] rounded-full text-[9px] md:text-[10px] uppercase tracking-[0.3em] text-[#8B7E74]">
            AI Fashion Studio
          </div>
          <h1 className="text-4xl md:text-6xl font-extralight tracking-tight text-[#2D2926]">
            Virtual Try-On
          </h1>
        </header>

        <main className="grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-16 items-start">
          {/* Left: Configuration */}
          <section className="lg:col-span-7 space-y-8 md:space-y-12">
            <div className="grid grid-cols-2 gap-4 md:gap-6">
              {[0, 1].map((idx) => (
                <div key={idx} className="relative group">
                  <div className={`aspect-[3/4] rounded-xl border-2 border-dashed border-[#D9D1C7] bg-white/50 overflow-hidden flex items-center justify-center transition-all duration-500 ${!images[idx] ? 'hover:border-[#8B7E74] hover:bg-white' : 'border-solid border-[#D9D1C7]'}`}>
                    {images[idx] ? (
                      <img
                        src={images[idx]}
                        alt={`Input ${idx + 1}`}
                        className="w-full h-full object-cover animate-in fade-in duration-700"
                      />
                    ) : (
                      <div className="text-center p-4 md:p-6 space-y-2 md:space-y-3">
                        <div className="w-8 h-8 md:w-10 md:h-10 mx-auto bg-white rounded-full shadow-sm flex items-center justify-center text-[#8B7E74] group-hover:scale-110 transition-transform">
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="md:w-5 md:h-5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                        </div>
                        <span className="block text-[9px] md:text-[10px] uppercase tracking-[0.2em] font-medium text-[#8B7E74] opacity-80">
                          {idx === 0 ? "Subject" : "Garment"}
                        </span>
                      </div>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageChange(idx, e)}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                  </div>
                  {images[idx] && (
                    <button 
                      onClick={() => {
                        const newImages = [...images];
                        newImages[idx] = null;
                        setImages(newImages);
                      }}
                      className="absolute top-2 right-2 w-6 h-6 bg-black/50 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 md:space-y-5">
              <textarea
                name="prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                aria-label="Styling instructions for the try-on"
                className="w-full h-36 md:h-40 py-3 px-3 sm:px-4 md:px-5 bg-white border border-[#D9D1C7] rounded-xl text-xs md:text-sm leading-relaxed resize-y max-h-[50vh] md:max-h-96 focus:outline-none focus:ring-2 focus:ring-[#8B7E74]/10 focus:border-[#8B7E74] transition-all"
              />

              <button
                type="submit"
                disabled={loading || !images[0] || !images[1]}
                className={`w-full py-4 md:py-5 px-8 md:px-10 text-[10px] md:text-xs uppercase tracking-[0.4em] font-bold transition-all duration-500 rounded-xl shadow-lg hover:shadow-xl active:scale-[0.98] ${
                  loading || !images[0] || !images[1]
                    ? "bg-[#D9D1C7] text-white cursor-not-allowed shadow-none"
                    : "bg-[#433E3A] text-white hover:bg-[#2D2926]"
                }`}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-1.5 h-1.5 bg-white rounded-full animate-bounce [animation-delay:-0.3s]" />
                    <span className="w-1.5 h-1.5 bg-white rounded-full animate-bounce [animation-delay:-0.15s]" />
                    <span className="w-1.5 h-1.5 bg-white rounded-full animate-bounce" />
                  </span>
                ) : (
                  "Generate Try-On"
                )}
              </button>
            </form>

            {error && (
              <div className="p-4 bg-red-50 text-red-900 text-xs rounded-xl border border-red-100">
                <strong>Error:</strong> {error}
              </div>
            )}
          </section>

          {/* Right: Result */}
          <section className="lg:col-span-5 lg:sticky lg:top-8" ref={resultRef}>
            <div className="relative aspect-[3/4] w-full rounded-2xl bg-white shadow-xl overflow-hidden border border-[#D9D1C7]/30">
              {prediction?.output ? (
                <div className="relative w-full h-full group">
                  <Image
                    fill
                    src={prediction.output[prediction.output.length - 1]}
                    alt="Output"
                    className="object-cover animate-in fade-in zoom-in-95 duration-1000 ease-out"
                    sizes="(max-width: 1024px) 100vw, 40vw"
                    priority
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  
                  <div className="absolute bottom-4 left-4 right-4 translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500">
                    <button
                      onClick={() => {
                        const link = document.createElement('a');
                        link.href = prediction.output[prediction.output.length - 1];
                        link.download = `try-on-${prediction.id}.webp`;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                      }}
                      className="w-full py-3 bg-white text-[#433E3A] text-[9px] md:text-[10px] uppercase tracking-[0.3em] font-bold rounded-lg shadow-lg hover:bg-[#F8F5F2] transition-colors flex items-center justify-center gap-2"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                      Download
                    </button>
                  </div>
                </div>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center bg-[#FAF9F7]">
                  {loading ? (
                    <div className="space-y-4">
                      <div className="relative w-12 h-12 mx-auto">
                        <div className="absolute inset-0 border-2 border-[#D9D1C7] rounded-full" />
                        <div className="absolute inset-0 border-2 border-[#8B7E74] rounded-full border-t-transparent animate-spin" />
                      </div>
                      <p className="text-[9px] uppercase tracking-[0.3em] font-bold text-[#8B7E74] animate-pulse">
                        Rendering...
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4 opacity-40 px-8">
                      <div className="w-10 h-px bg-[#8B7E74] mx-auto" />
                      <p className="text-[10px] md:text-xs italic font-serif text-[#433E3A]">
                        Your virtual ensemble will appear here
                      </p>
                      <div className="w-10 h-px bg-[#8B7E74] mx-auto" />
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {prediction && !loading && (
              <div className="mt-6 flex justify-between items-center px-2">
                <div className="flex items-center gap-2">
                  <div className={`w-1.5 h-1.5 rounded-full ${prediction.status === 'succeeded' ? 'bg-green-400' : 'bg-amber-400'}`} />
                  <p className="text-[9px] uppercase tracking-[0.2em] font-bold text-[#8B7E74]">
                    {prediction.status}
                  </p>
                </div>
                <p className="text-[9px] text-[#8B7E74] opacity-50">
                  ID: {prediction.id.slice(0, 8)}
                </p>
              </div>
            )}
          </section>
        </main>

        <footer className="mt-20 md:mt-40 pt-12 md:pt-16 border-t border-[#D9D1C7]/50 flex flex-col md:flex-row justify-between items-center gap-8 md:gap-12 text-center">
          <div className="flex gap-6 md:gap-10 text-[9px] md:text-[10px] uppercase tracking-[0.3em] font-bold text-[#8B7E74]">
            <a href="#" className="hover:text-[#433E3A] transition-colors">Archive</a>
            <a href="#" className="hover:text-[#433E3A] transition-colors">Privacy</a>
            <a href="#" className="hover:text-[#433E3A] transition-colors">Contact</a>
          </div>
          <p className="text-[9px] md:text-[10px] uppercase tracking-[0.3em] text-[#8B7E74] opacity-40 italic">
            Nano Banana AI
          </p>
        </footer>
      </div>
    </div>
  );
}
