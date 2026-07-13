import Link from "next/link";

const links = [
  { href: "/docs", label: "Overview" },
  { href: "/docs/features", label: "Feature Coverage" },
  { href: "/docs/modularity", label: "Modularity" },
  { href: "/docs/api", label: "API Reference" },
  { href: "/docs/testing", label: "Testing Evidence" }
] as const;

export function DocsNav() {
  return (
    <nav aria-label="Documentation" className="docsNav">
      {links.map((link) => (
        <Link href={link.href} key={link.href}>{link.label}</Link>
      ))}
    </nav>
  );
}
