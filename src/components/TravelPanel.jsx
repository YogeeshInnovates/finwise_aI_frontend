import { formatMoney } from "../lib/format";
import "../travel-panel.css";

const money = (value) => `₹${formatMoney(value)}`;

export default function TravelPanel({data,onClose}){
  const rows = data?.summary_rows || [];
  const destinations = data?.destinations || [];

  return (
    <section className="travel-panel" role="dialog" aria-label="Trip suggestions">
      <header className="tp-head">
        <div>
          <span className="tp-kicker">AI TRIP PLANNER</span>
          <h2>Trip suggestions</h2>
          <p>Near {data?.location || "your current location"}</p>
        </div>
        <button type="button" className="tp-close" onClick={onClose} aria-label="Close trip suggestions">×</button>
      </header>

      <div className="tp-body">
        <section className="tp-budget">
          <div className="tp-headline">
            {data?.monthly_summary?.headline || "Plan built from your flexible balance after keeping a monthly buffer."}
          </div>
          <div className="tp-budget-item">
            <span>Flexible available</span>
            <strong>{money(data?.flexible_remaining)}</strong>
          </div>
          <div className="tp-budget-item">
            <span>Kept aside for extra expenditure</span>
            <strong>{money(data?.reserved_buffer)}</strong>
          </div>
          <div className="tp-budget-item">
            <span>Safe trip budget this month</span>
            <strong>{money(data?.safe_monthly_allocation)}</strong>
          </div>
          {data?.allocation_reason && <p className="tp-reason">{data.allocation_reason}</p>}
        </section>

        {data?.note && <div className="tp-note">{data.note}</div>}

        {rows.length > 0 && (
          <section className="tp-table-wrap">
            <table className="tp-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Destination</th>
                  <th>Distance / Direction</th>
                  <th>Best Transport</th>
                  <th>Cost Breakdown</th>
                  <th>Total</th>
                  <th>Remaining</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row,index)=>(
                  <tr key={index}>
                    <td>{row.rank || index + 1}</td>
                    <td className="tp-place">{row.destination || "—"}</td>
                    <td>{row.distance_direction || "—"}</td>
                    <td>{row.best_transport || "—"}</td>
                    <td>{row.cost_breakdown || "—"}</td>
                    <td className="tp-num">{money(row.total)}</td>
                    <td className="tp-num tp-remaining">{money(row.remaining)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        <section className="tp-destinations">
          {destinations.map((place,index)=>(
            <article className="tp-card" key={`${place.name}-${index}`}>
              <div className="tp-media">
                <img src={place.image_url} alt={place.name} loading="lazy" />
                <span className="tp-rank">{index + 1}</span>
              </div>
              <div className="tp-card-body">
                <h3>{place.name}</h3>
                {place.distance_direction && <p className="tp-distance">{place.distance_direction}</p>}
                {place.best_transport && <p className="tp-transport">{place.best_transport}</p>}

                <div className="tp-costs">
                  <div><span>Transport</span><strong>{money(place.transport)}</strong></div>
                  <div><span>Stay</span><strong>{money(place.stay)}</strong></div>
                  <div><span>Food</span><strong>{money(place.food)}</strong></div>
                  <div><span>Local sightseeing</span><strong>{money(place.local_sightseeing)}</strong></div>
                  <div className="tp-total"><span>Total</span><strong>{money(place.total)}</strong></div>
                  <div className="tp-left"><span>Remaining</span><strong>{money(place.remaining)}</strong></div>
                </div>

                {(place.top_spots || []).length > 0 && (
                  <div className="tp-spots">
                    <span className="tp-label">Top spots</span>
                    <div className="tp-chips">
                      {place.top_spots.map((spot,i)=><span key={i}>{spot}</span>)}
                    </div>
                  </div>
                )}

                {place.maps_url && (
                  <a className="tp-map" href={place.maps_url} target="_blank" rel="noreferrer">
                    View on Google Maps ↗
                  </a>
                )}
              </div>
            </article>
          ))}
        </section>

        {rows.length === 0 && destinations.length === 0 && !data?.note && (
          <div className="tp-empty">No trip suggestions are available yet.</div>
        )}
      </div>
    </section>
  );
}
