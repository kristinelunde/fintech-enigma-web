import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import Link from "@docusaurus/Link";
import oversikt from "../../../docs/Portefoljeoversikt/Fintech Enigma Portefoljesammensetning.mdx";

import {
  Chart as ChartJS,
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Tooltip,
  Legend,
  Title,
} from "chart.js";

ChartJS.register(
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Tooltip,
  Legend,
  Title
);


export default function Fondsgraf() {
  const DATA_URL = "https://fintechenigmaapi.onrender.com/getFundAPISheets";

  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        setLoading(true);
        setError("");

        // 1) GET data
        const res = await axios.get(DATA_URL, {
          params: { t: Date.now() }, // cache-buster
        });

        // Forventer: { data: [ { dato: "2023-01-14", avkastning: 0.9 }, ... ] }
        const rows = res.data?.data?.avkastningListe ?? [];


        // 2) Lag variabler til plott
        const labels = rows.map(r => r.dato);
        const values = rows.map(r => Number(r.avkastning));


        if (cancelled) return;

        // 3) Tegn chart
        if (chartRef.current) {
          chartRef.current.destroy();
          chartRef.current = null;
        }

        const ctx = canvasRef.current.getContext("2d");
        chartRef.current = new ChartJS(ctx, {
          type: "line",
          data: {
            labels,
            datasets: [
              {
                label: "Avkastning",
                data: values,
                tension: 0.25,
                pointRadius: 0,
                borderColor: '#06ADF4',
                backgroundColor: "#06ADF4",
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: "index", intersect: false },
            plugins: {
              title: { 
                display: true, 
                text: "Fintech Enigma Fondet",
                color: "#000000",
                font: { 
                  size: 24,
                  weight: 'bold'
                },
                padding: {
                  top: 20,
                  bottom: 30
                }
              },
              legend: { display: false },
            },
            scales: {
              x: { 
                title: { display: true, text: "Dato" },
                ticks: { 
                  maxTicksLimit: 10,
                  callback: function(value, index, ticks) {
                    const date = new Date(this.getLabelForValue(value));
                    const day = String(date.getDate()).padStart(2, '0');
                    const month = String(date.getMonth() + 1).padStart(2, '0');
                    const year = String(date.getFullYear()).slice(-2);
                    return `${day}.${month}.${year}`;
                  }
                }
              },
              y: { title: { display: true, text: "Avkastning" } },
            },
          },
        });
      } catch (e) {
        if (cancelled) return;
        setError(e?.message || "Ukjent feil ved henting/plotting");
      } finally {
        if (cancelled) return;
        setLoading(false);
      }
    }

    run();

    return () => {
      cancelled = true;
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
    };
  }, []);

  return (
    <div>
      <div style={{ maxWidth: 900, margin: "24px auto" }}>
        {loading && <div>Laster graf…</div>}
        {error && (
          <div style={{ color: "crimson" }}>
            Feil: {error}
          </div>
        )}
        <div style={{ height: 420, display: loading ? "none" : "block" }}>
          <canvas ref={canvasRef} />
        </div>
      </div>
      
      <div style={{ textAlign: "center", marginTop: 16 }}>
        <Link
          to="docs/Portefoljeoversikt/portefoljesammensetning"
          style={{
          display: "inline-block",
          padding: "10px 16px",
          backgroundColor: "#06ADF4",
          color: "black",
          borderRadius: 6,
          textDecoration: "none",
          fontWeight: 500,
        }}
        >
          Se Porteføljen
        </Link>
      </div>

    </div>

  );
}
