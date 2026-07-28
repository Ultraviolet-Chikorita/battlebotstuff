export function PriceHistory({
  points,
}: {
  points: Array<{ priceABps: number; recordedAt: string }>;
}) {
  const display = points.length >= 2
    ? points
    : [
        ...(points.length ? points : [{ priceABps: 5000, recordedAt: "" }]),
        { priceABps: points[0]?.priceABps ?? 5000, recordedAt: "" },
      ];
  return (
    <div className="price-chart" aria-label="Blue square probability history">
      <div className="chart-labels"><span>100%</span><span>50%</span><span>0%</span></div>
      <div className="chart-bars">
        {display.map((point, index) => (
          <span
            key={`${point.recordedAt}-${index}`}
            style={{ height: `${Math.max(4, point.priceABps / 100)}%` }}
            title={`${(point.priceABps / 100).toFixed(1)}%`}
          />
        ))}
      </div>
    </div>
  );
}
