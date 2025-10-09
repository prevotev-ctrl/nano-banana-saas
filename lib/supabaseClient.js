"use client";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

// Use Next.js auth helpers so sessions are stored in cookies
// and can be read by middleware and server route handlers.
export const supabase = createClientComponentClient();
