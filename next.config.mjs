// Cabeçalhos de segurança base em todas as respostas; uma CSP exige nonces e fica para mais tarde.
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Só em produção: o servidor de desenvolvimento também é HTTPS, e o HSTS em `localhost` prenderia todas as portas a HTTPS durante um ano.
  ...(process.env.NODE_ENV === "production" ? [{ key: "Strict-Transport-Security", value: "max-age=31536000" }] : []),
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig = {
  output: "standalone",
  devIndicators: false,
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  // `/uploads/*` é servido pela rota da API, que lê do disco.
  async rewrites() {
    return [
      {
        source: "/uploads/:path*",
        destination: "/api/uploads/:path*",
      },
    ];
  },
  images: {
    formats: ["image/webp", "image/avif"],
  },
};

export default nextConfig;
