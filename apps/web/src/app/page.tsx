const highlights = [
  "Tek panelden platform secimi",
  "Video zamanlama ve yayinlama",
  "Onay akisi ve rol yonetimi",
  "Platform bazli yayin durumu takibi"
];

export default function HomePage() {
  return (
    <main style={{ padding: 24, maxWidth: 880, margin: "0 auto" }}>
      <h1>Socialflow Publisher</h1>
      <p>
        Kurumsal ekipler icin tek panelden YouTube, Instagram ve TikTok paylasim yonetimi
        altyapisi.
      </p>
      <ul>
        {highlights.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </main>
  );
}
