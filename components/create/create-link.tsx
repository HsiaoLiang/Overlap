"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

/** Keep the creation transition in the scene, including when already at home. */
export function CreateLink() {
  return (
    <Link className="nav-create" href="/#create-event" onClick={event => {
      if (window.location.pathname === "/") {
        event.preventDefault();
        window.dispatchEvent(new Event("overlap:create"));
      }
    }}>
      Make a plan <ArrowUpRight size={17} aria-hidden />
    </Link>
  );
}
