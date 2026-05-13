import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // Empleados se movió de /admin/empleados a /empleados (sidebar lateral).
      { source: "/admin/empleados", destination: "/empleados", permanent: true },
      { source: "/admin/empleados/:path*", destination: "/empleados/:path*", permanent: true },
    ];
  },
};

export default nextConfig;
