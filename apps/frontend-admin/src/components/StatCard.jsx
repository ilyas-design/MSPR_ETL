function StatCard({ icon, title, value, unit, color, accentBg }) {
  const iconStyle = {};
  if (color) iconStyle.color = color;
  if (accentBg) iconStyle.background = accentBg;

  return (
    <div className="stat-box">
      {icon ? (
        <span className="stat-icon" aria-hidden="true" style={iconStyle}>
          {icon}
        </span>
      ) : null}
      <h4>{title}</h4>
      <p className="big-number" style={color ? { color } : undefined}>
        {value}
      </p>
      {unit ? <span className="unit">{unit}</span> : null}
    </div>
  );
}

export default StatCard;
