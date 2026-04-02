"use client";

import Link from "next/link";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";

type OrgSidebarProps = {
  orgId: string;
  orgName: string;
  active: "board" | "contributors";
};

export function OrgSidebar({ orgId, orgName, active }: OrgSidebarProps) {
  const items = [
    {
      label: "Boards",
      href: `/org/${orgId}/board`,
      key: "board",
    },
    {
      label: "Contributors",
      href: `/org/${orgId}/contributors`,
      key: "contributors",
    },
  ] as const;

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="brand-badge">MD</div>
        <div>
          <strong>My DevOps</strong>
          <span>{orgName}</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        <Link href="/dashboard" className="sidebar-link">
          Overview
        </Link>

        {items.map((item) => (
          <Link
            key={item.key}
            href={item.href}
            className={`sidebar-link ${active === item.key ? "active" : ""}`}
          >
            {item.label}
          </Link>
        ))}

        <button
          className="sidebar-link sidebar-button"
          onClick={async () => {
            await signOut(auth);
          }}
        >
          Sign out
        </button>
      </nav>
    </aside>
  );
}
