export default function NotFound() {
  return (
    <div style={{ padding: "2rem", color: "rgba(255,255,255,0.8)", textAlign: "center" }}>
      <h1 style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>Page not found</h1>
      <p style={{ color: "rgba(255,255,255,0.6)" }}>
        The page you were looking for does not exist.
      </p>
      <a href="/" style={{ color: "#8af" }}>Back home</a>
    </div>
  );
}
