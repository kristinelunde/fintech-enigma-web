import React, { useEffect, useRef, useState } from "react";
import Layout from "@theme/Layout";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  DoughnutController,
} from "chart.js";

ChartJS.register(ArcElement, Tooltip, Legend, DoughnutController);

/* ---------- Hjelpefunksjoner ---------- */

function formatPct(x) {
  if (!Number.isFinite(x)) return "-";
  return `${(x * 100).toFixed(2)}%`;
}

function formatNOK(x) {
  if (!Number.isFinite(x)) return "-";
  return new Intl.NumberFormat("nb-NO", {
    style: "currency",
    currency: "NOK",
  }).format(x);
}

function normalizeHoldings(holdings) {
  const totalValue =
    holdings.reduce((sum, h) => sum + (Number(h.valueNOK) || 0), 0) || 0;

  return holdings
    .map((h) => {
      const valueNOK = Number(h.valueNOK) || 0;
      return {
        ...h,
        valueNOK,
        weight: totalValue > 0 ? valueNOK / totalValue : 0,
      };
    })
    .sort((a, b) => b.valueNOK - a.valueNOK);
}

/* ---------- Donut Chart with Canvas API ---------- */

function DonutChart({ labels, values }) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    try {
      if (!canvasRef.current) {
        throw new Error("Canvas element not found");
      }

      // Destroy existing chart first
      if (chartRef.current) {
        chartRef.current.destroy();
      }

      const ctx = canvasRef.current.getContext("2d");
      const sum = values.reduce((a, b) => a + b, 0) || 1;

      chartRef.current = new ChartJS(ctx, {
        type: "doughnut",
        data: {
          labels,
          datasets: [
            {
              data: values,
              backgroundColor: [
                "#06ADF4",
                "#FF6B6B",
                "#4ECDC4",
                "#45B7D1",
                "#FFA07A",
                "#98D8C8",
                "#F7DC6F",
                "#BB8FCE",
              ],
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: "bottom" },
            tooltip: {
              callbacks: {
                label: (ctx) => {
                  const v = Number(ctx.parsed);
                  const w = v / sum;
                  return `${ctx.label}: ${formatPct(w)} (${formatNOK(v)})`;
                },
              },
            },
          },
        },
      });
    } catch (e) {
      if (!cancelled) setError(e.message || "Feil ved tegning av graf");
    }

    return () => {
      cancelled = true;
      if (chartRef.current) {
        chartRef.current.destroy();
      }
    };
  }, [labels, values]);

  return (
    <div>
      {error && <div style={{ color: "crimson" }}>Feil: {error}</div>}
      <div style={{ height: 320 }}>
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
}
// ...existing code...

/* ---------- Side ---------- */

export default function PortefoljeSam() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [holdings, setHoldings] = useState([]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setError("");

        const res = await fetch("/mockdata/portefoljeSam.json");
        if (!res.ok) throw new Error("Kunne ikke laste porteføljedata");

        const json = await res.json();
        if (!cancelled) {
          setHoldings(json.holdings || []);
        }
      } catch (e) {
        if (!cancelled) setError(e.message || "Ukjent feil");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const rows = React.useMemo(() => normalizeHoldings(holdings), [holdings]);
  const total = React.useMemo(
    () => rows.reduce((s, r) => s + r.valueNOK, 0),
    [rows]
  );

  const donutLabels = rows.map((r) => r.ticker);
  const donutValues = rows.map((r) => r.valueNOK);

  return (
    <div>
      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 16px" }}>
        <p>
          Oversikt over aksjesammensetning og vekting. Data lastes foreløpig fra
          mock-fil.
        </p>

        {loading && <div>Laster portefølje…</div>}

        {!loading && error && (
          <div style={{ color: "crimson" }}>Feil: {error}</div>
        )}

        {!loading && !error && rows.length > 0 && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.3fr 0.7fr",
              gap: 16,
              marginTop: 16,
            }}
          >
            {/* Tabell */}
            <div style={{ border: "1px solid rgba(0,0,0,0.12)", borderRadius: 12, padding: 16 }}>
              <h2>Beholdninger</h2>

              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th align="left">Ticker</th>
                    <th align="left">Navn</th>
                    <th align="left">Sektor</th>
                    <th align="right">Verdi</th>
                    <th align="right">Vekt</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.ticker} style={{ borderTop: "1px solid rgba(0,0,0,0.08)" }}>
                      <td><strong>{r.ticker}</strong></td>
                      <td>{r.name}</td>
                      <td>{r.sector}</td>
                      <td align="right">{formatNOK(r.valueNOK)}</td>
                      <td align="right">{formatPct(r.weight)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ borderTop: "2px solid rgba(0,0,0,0.2)" }}>
                    <td colSpan={3}><strong>Total</strong></td>
                    <td align="right"><strong>{formatNOK(total)}</strong></td>
                    <td align="right"><strong>100%</strong></td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Donut */}
            <div style={{ border: "1px solid rgba(0,0,0,0.12)", borderRadius: 12, padding: 16 }}>
              <h2>Fordeling</h2>
              <DonutChart labels={donutLabels} values={donutValues} />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}